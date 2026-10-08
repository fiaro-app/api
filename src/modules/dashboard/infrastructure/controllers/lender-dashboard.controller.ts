import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import { ApiGetLenderDashboard } from '@/modules/dashboard/infrastructure/controllers/docs/lender-dashboard-routes.docs.js';
import {
  toLenderDashboardResponse,
  type LenderDashboardResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver el resumen del negocio (PRODUCT.md §5: `LENDER` lo administra). */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * El resumen del negocio del prestamista con el que opera la sesión (D-99). Exige
 * `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Un `COLLECTOR` tiene su propio resumen en `CollectorStatsController`
 * (`GET /collectors/me/daily-summary`), con solo lo suyo: este, en cambio, agrega todo el
 * negocio, así que exige `OWNER` o `LENDER` igual que el resto de rutas que administran el
 * prestamista (`LenderController`, `MembershipController`).
 */
@ApiTags(API_TAGS.lenderDashboard.name)
@Controller('lenders/me')
@UseGuards(LenderScopeGuard)
export class LenderDashboardController {
  constructor(
    private readonly getLenderDashboardUseCase: GetLenderDashboardUseCase,
  ) {}

  /** @param scope - El Lender con el que opera la sesión. */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiGetLenderDashboard()
  async getLenderDashboard(
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LenderDashboardResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLenderDashboardResponse(
      await this.getLenderDashboardUseCase.execute(scope.lenderId),
    );
  }
}
