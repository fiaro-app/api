import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import {
  ApiGetCollectorDailySummary,
  ApiGetCollectorStats,
} from '@/modules/collections/infrastructure/controllers/docs/collector-stats-routes.docs.js';
import {
  GetCollectorDailySummaryRequestSchema,
  GetCollectorStatsRequestSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-requests.schema.js';
import {
  toCollectorDailySummaryResponse,
  toCollectorPeriodStatsResponse,
  type CollectorDailySummaryResponseSchema,
  type CollectorPeriodStatsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Rol que puede verlas: siempre las propias, de quien cobra (PRODUCT.md §5). */
const COLLECTOR_ROLES = ['COLLECTOR'];

/**
 * Lo propio de un cobrador: su resumen del día y sus estadísticas de desempeño
 * (PROTOTIPO-FLUJOS.md §4.4, D-98). Exige `LenderScopeGuard`, así que corre después de
 * `AuthGuard` y ya sabe con qué Lender operar.
 */
@ApiTags(API_TAGS.collectorStats.name)
@Controller('collectors/me')
@UseGuards(LenderScopeGuard)
export class CollectorStatsController {
  constructor(
    private readonly getCollectorDailySummaryUseCase: GetCollectorDailySummaryUseCase,
    private readonly getCollectorStatsUseCase: GetCollectorStatsUseCase,
  ) {}

  /**
   * @param query - La fecha, ya validada.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @QueryMethod('daily-summary')
  @HttpCode(HttpStatus.OK)
  @ApiGetCollectorDailySummary()
  async getCollectorDailySummary(
    @Body({ schema: GetCollectorDailySummaryRequestSchema })
    query: z.output<typeof GetCollectorDailySummaryRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectorDailySummaryResponseSchema>> {
    if (!hasAnyRole(scope.roles, COLLECTOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toCollectorDailySummaryResponse(
      await this.getCollectorDailySummaryUseCase.execute({
        collectorMembershipId: scope.membershipId,
        lenderId: scope.lenderId,
        date: query.date,
      }),
    );
  }

  /**
   * @param query - El rango de fechas, ya validado.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @QueryMethod('stats')
  @HttpCode(HttpStatus.OK)
  @ApiGetCollectorStats()
  async getCollectorStats(
    @Body({ schema: GetCollectorStatsRequestSchema })
    query: z.output<typeof GetCollectorStatsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectorPeriodStatsResponseSchema>> {
    if (!hasAnyRole(scope.roles, COLLECTOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toCollectorPeriodStatsResponse(
      await this.getCollectorStatsUseCase.execute({
        collectorMembershipId: scope.membershipId,
        lenderId: scope.lenderId,
        from: query.dateRange?.from,
        to: query.dateRange?.to,
      }),
    );
  }
}
