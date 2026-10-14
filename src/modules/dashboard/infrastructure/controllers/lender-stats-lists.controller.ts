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
import { ListCollectorPerformanceUseCase } from '@/modules/dashboard/application/use-cases/list-collector-performance.use-case.js';
import { ListTopArrearsUseCase } from '@/modules/dashboard/application/use-cases/list-top-arrears.use-case.js';
import {
  ApiListCollectorPerformance,
  ApiListTopArrears,
} from '@/modules/dashboard/infrastructure/controllers/docs/lender-stats-lists-routes.docs.js';
import {
  ListCollectorPerformanceRequestSchema,
  ListTopArrearsRequestSchema,
  toStatsPageResponse,
  type CollectorPerformancePageResponseSchema,
  type TopArrearsPageResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-lists.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { cacheKey } from '@/shared/infrastructure/cache/cache-key.js';
import { CACHE_TTL_SECONDS } from '@/shared/infrastructure/cache/cache-ttl.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Mismos roles que las estadísticas (`LenderDashboardController`). */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * Las dos listas largas de las estadísticas, paginadas: el ranking de mayor mora y el desempeño
 * por cobrador. `QUERY /lenders/me/stats` trae solo las primeras 5 filas de cada una.
 */
@ApiTags(API_TAGS.lenderDashboard.name)
@Controller('lenders/me/stats')
@UseGuards(LenderScopeGuard)
export class LenderStatsListsController {
  constructor(
    private readonly listTopArrearsUseCase: ListTopArrearsUseCase,
    private readonly listCollectorPerformanceUseCase: ListCollectorPerformanceUseCase,
    @Inject(READ_CACHE) private readonly cache: ReadCache,
  ) {}

  /**
   * @param query - Los filtros y la página, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod('top-arrears')
  @HttpCode(HttpStatus.OK)
  @ApiListTopArrears()
  async listTopArrears(
    @Body({ schema: ListTopArrearsRequestSchema })
    query: z.output<typeof ListTopArrearsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof TopArrearsPageResponseSchema>> {
    assertViewer(scope);
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('stats-top-arrears', query),
      CACHE_TTL_SECONDS.stats,
      async () =>
        toStatsPageResponse(
          await this.listTopArrearsUseCase.execute({
            lenderId: scope.lenderId,
            ...query,
          }),
          query,
        ),
    );
  }

  /**
   * @param query - El período, la cartera y la página, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod('collector-performance')
  @HttpCode(HttpStatus.OK)
  @ApiListCollectorPerformance()
  async listCollectorPerformance(
    @Body({ schema: ListCollectorPerformanceRequestSchema })
    query: z.output<typeof ListCollectorPerformanceRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectorPerformancePageResponseSchema>> {
    assertViewer(scope);
    return this.cache.getOrLoad(
      scope.lenderId,
      cacheKey('stats-collector-performance', query),
      CACHE_TTL_SECONDS.stats,
      async () =>
        toStatsPageResponse(
          await this.listCollectorPerformanceUseCase.execute({
            lenderId: scope.lenderId,
            from: query.dateRange?.from,
            to: query.dateRange?.to,
            portfolioId: query.portfolioId,
            page: query.page,
            pageSize: query.pageSize,
          }),
          query,
        ),
    );
  }
}

/** Exige `OWNER` o `LENDER`. */
function assertViewer(scope: LenderScope): void {
  if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
    throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
  }
}
