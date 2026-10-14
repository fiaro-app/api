import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { from, mergeMap, type Observable } from 'rxjs';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { getLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

/** Métodos que cambian datos; `GET` y `QUERY` solo leen. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Invalida la caché del prestamista después de toda escritura exitosa que pasó por
 * `LenderScopeGuard` (D-118), antes de responder: quien escribe y luego lee ve su cambio.
 *
 * @remarks
 * Invalidar todo el prestamista con cualquier escritura es a propósito: es una sola operación
 * (`ReadCache.invalidate`), no hay que mantener a mano qué escritura toca qué lectura, y una visita
 * de un cobrador cambia a la vez listas, resumen y estadísticas. Una escritura que falla no
 * invalida nada.
 */
@Injectable()
export class InvalidateLenderCacheInterceptor implements NestInterceptor {
  constructor(@Inject(READ_CACHE) private readonly cache: ReadCache) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!WRITE_METHODS.has(request.method)) {
      return next.handle();
    }
    return next.handle().pipe(
      mergeMap((body: unknown) => {
        const scope = getLenderScope(request);
        if (scope === undefined) {
          return [body];
        }
        return from(this.cache.invalidate(scope.lenderId).then(() => body));
      }),
    );
  }
}
