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
import type { z } from 'zod';
import { GetConsolidatedStatsUseCase } from '@/modules/dashboard/application/use-cases/get-consolidated-stats.use-case.js';
import { ApiGetConsolidatedStats } from '@/modules/dashboard/infrastructure/controllers/docs/lender-consolidated-stats-routes.docs.js';
import {
  ConsolidatedStatsResponseSchema,
  GetConsolidatedStatsRequestSchema,
  toConsolidatedStatsResponse,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-consolidated-stats.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { CurrentUser } from '@/shared/infrastructure/http/current-user.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { RequiresPlanFeature } from '@/shared/infrastructure/http/requires-plan-feature.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver las estadísticas del negocio. */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * `QUERY /lenders/me/consolidated-stats`: las cifras de todos los negocios que la persona administra
 * en su Tenant, juntas (D-155, plan Team).
 */
@ApiTags(API_TAGS.lenderDashboard.name)
@Controller('lenders/me')
@UseGuards(LenderScopeGuard)
export class LenderConsolidatedStatsController {
  constructor(private readonly getConsolidated: GetConsolidatedStatsUseCase) {}

  /**
   * @param query - El período, ya validado.
   * @param scope - El negocio con el que opera la sesión.
   * @param user - La persona autenticada.
   */
  @RequiresPlanFeature('CONSOLIDATED_STATS')
  @QueryMethod('consolidated-stats')
  @HttpCode(HttpStatus.OK)
  @ApiGetConsolidatedStats()
  async getConsolidatedStats(
    @Body({ schema: GetConsolidatedStatsRequestSchema })
    query: z.output<typeof GetConsolidatedStatsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<z.output<typeof ConsolidatedStatsResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toConsolidatedStatsResponse(
      await this.getConsolidated.execute({
        userId: user.id,
        lenderId: scope.lenderId,
        from: query.dateRange?.from,
        to: query.dateRange?.to,
      }),
    );
  }
}
