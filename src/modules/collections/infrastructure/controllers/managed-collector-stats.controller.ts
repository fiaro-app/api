import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { GetManagedCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-managed-collector-stats.use-case.js';
import { ApiGetManagedCollectorStats } from '@/modules/collections/infrastructure/controllers/docs/managed-collector-stats-routes.docs.js';
import { GetManagedCollectorStatsQuerySchema } from '@/modules/collections/infrastructure/controllers/schemas/managed-collector-stats-requests.schema.js';
import {
  toCollectorPeriodStatsResponse,
  type CollectorPeriodStatsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { cacheKey } from '@/shared/infrastructure/cache/cache-key.js';
import { CACHE_TTL_SECONDS } from '@/shared/infrastructure/cache/cache-ttl.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver el desempeño de un cobrador ajeno (mismo criterio que administrarlos). */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * El desempeño de un cobrador visto por quien administra el negocio. Exige `LenderScopeGuard`,
 * así que corre después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Comparte la ruta base `collectors` con `CollectorController` (la baja, D-97) y con
 * `CollectorStatsController` (`collectors/me`, lo propio del cobrador, D-98): `me` es una ruta
 * literal más específica que `:id`, así que `GET /collectors/me/stats` nunca llega aquí. Aquí sí
 * se admite la propia membresía, porque ver no tiene el riesgo de dejar el negocio sin
 * administrador (D-106).
 */
@ApiTags(API_TAGS.collectorStats.name)
@Controller('collectors')
@UseGuards(LenderScopeGuard)
export class ManagedCollectorStatsController {
  constructor(
    private readonly getManagedCollectorStatsUseCase: GetManagedCollectorStatsUseCase,
    @Inject(READ_CACHE) private readonly cache: ReadCache,
  ) {}

  /**
   * @param id - La membresía del cobrador.
   * @param query - El período, opcional, ya validado.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiGetManagedCollectorStats()
  async getManagedCollectorStats(
    @Param('id', { schema: z.uuid() }) id: string,
    @Query({ schema: GetManagedCollectorStatsQuerySchema })
    query: z.output<typeof GetManagedCollectorStatsQuerySchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectorPeriodStatsResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('collector-stats', { id, ...query }),
      CACHE_TTL_SECONDS.stats,
      async () =>
        toCollectorPeriodStatsResponse(
          await this.getManagedCollectorStatsUseCase.execute({
            collectorMembershipId: id,
            lenderId: scope.lenderId,
            from: query.from,
            to: query.to,
          }),
        ),
    );
  }
}
