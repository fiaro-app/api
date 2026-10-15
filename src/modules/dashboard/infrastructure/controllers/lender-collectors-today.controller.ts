import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { GetCollectorsTodayUseCase } from '@/modules/dashboard/application/use-cases/get-collectors-today.use-case.js';
import { ApiGetCollectorsToday } from '@/modules/dashboard/infrastructure/controllers/docs/collectors-today-routes.docs.js';
import {
  toCollectorsTodayResponse,
  type CollectorsTodayResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/collectors-today-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { cacheKey } from '@/shared/infrastructure/cache/cache-key.js';
import { CACHE_TTL_SECONDS } from '@/shared/infrastructure/cache/cache-ttl.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver cómo va la jornada de sus cobradores. */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * `GET /lenders/me/collectors-today`: la jornada de hoy de cada cobrador activo. Exige `OWNER` o
 * `LENDER`. Va en la caché de lecturas; cada visita o cuadre que se escribe la invalida.
 */
@ApiTags(API_TAGS.lenderDashboard.name)
@Controller('lenders/me')
@UseGuards(LenderScopeGuard)
export class LenderCollectorsTodayController {
  constructor(
    private readonly getCollectorsToday: GetCollectorsTodayUseCase,
    @Inject(READ_CACHE) private readonly cache: ReadCache,
  ) {}

  /** @param scope - El Lender con el que opera la sesión. */
  @Get('collectors-today')
  @HttpCode(HttpStatus.OK)
  @ApiGetCollectorsToday()
  async getCollectorsTodayProgress(
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectorsTodayResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('collectors-today'),
      CACHE_TTL_SECONDS.stats,
      async () =>
        toCollectorsTodayResponse(
          await this.getCollectorsToday.execute(scope.lenderId),
        ),
    );
  }
}
