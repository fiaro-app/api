import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { GetLenderInsightsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-insights.use-case.js';
import { ApiGetLenderInsights } from '@/modules/dashboard/infrastructure/controllers/docs/lender-insights-routes.docs.js';
import {
  GetLenderInsightsRequestSchema,
  toLenderInsightsResponse,
  type LenderInsightsResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-insights-schemas.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { cacheKey } from '@/shared/infrastructure/cache/cache-key.js';
import { CACHE_TTL_SECONDS } from '@/shared/infrastructure/cache/cache-ttl.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { RequiresPlanFeature } from '@/shared/infrastructure/http/requires-plan-feature.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver las estadísticas del negocio. */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * `QUERY /lenders/me/stats/insights`: las estadísticas de cobro, ganancia, colocación y operación
 * del negocio (D-133). Exige `OWNER` o `LENDER`; va en la caché de lecturas, que cada escritura
 * del prestamista invalida.
 */
@ApiTags(API_TAGS.lenderDashboard.name)
@Controller('lenders/me')
@UseGuards(LenderScopeGuard)
export class LenderInsightsController {
  constructor(
    private readonly getLenderInsights: GetLenderInsightsUseCase,
    @Inject(READ_CACHE) private readonly cache: ReadCache,
  ) {}

  /**
   * @param query - El período, ya validado.
   * @param scope - El Lender con el que opera la sesión.
   */
  @RequiresPlanFeature('ADVANCED_STATS')
  @QueryMethod('stats/insights')
  @HttpCode(HttpStatus.OK)
  @ApiGetLenderInsights()
  async getInsights(
    @Body({ schema: GetLenderInsightsRequestSchema })
    query: z.output<typeof GetLenderInsightsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LenderInsightsResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('stats-insights', query),
      CACHE_TTL_SECONDS.stats,
      async () =>
        toLenderInsightsResponse(
          await this.getLenderInsights.execute({
            lenderId: scope.lenderId,
            from: query.dateRange?.from,
            to: query.dateRange?.to,
          }),
        ),
    );
  }
}
