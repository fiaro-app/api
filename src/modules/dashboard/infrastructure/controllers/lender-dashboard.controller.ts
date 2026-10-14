import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  QueryMethod,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import { GetLenderStatsExportUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats-export.use-case.js';
import { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import {
  ApiGetLenderDashboard,
  ApiGetLenderStats,
  ApiGetLenderStatsExport,
} from '@/modules/dashboard/infrastructure/controllers/docs/lender-dashboard-routes.docs.js';
import { renderLenderStatsPdf } from '@/modules/dashboard/infrastructure/pdf/lender-stats-pdf.js';
import {
  toLenderDashboardResponse,
  type LenderDashboardResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-responses.schema.js';
import { GetLenderDashboardQuerySchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-requests.schema.js';
import { GetLenderStatsExportRequestSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-export-requests.schema.js';
import { GetLenderStatsRequestSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-requests.schema.js';
import {
  toLenderPeriodStatsResponse,
  type LenderPeriodStatsResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver el resumen y las estadísticas del negocio (PRODUCT.md §5: `LENDER` lo administra). */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * Las vistas agregadas del Lender sobre todo su negocio: el resumen (D-99), las estadísticas de
 * cartera y mora (D-100) y su exportación a PDF (D-101). Exige `LenderScopeGuard`, así que corre
 * después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Un `COLLECTOR` tiene sus propias vistas en `CollectorStatsController`
 * (`GET /collectors/me/daily-summary`, `QUERY /collectors/me/stats`), con solo lo suyo: estas, en
 * cambio, agregan todo el negocio, así que exigen `OWNER` o `LENDER` igual que el resto de rutas
 * que administran el prestamista (`LenderController`, `MembershipController`).
 */
@ApiTags(API_TAGS.lenderDashboard.name)
@Controller('lenders/me')
@UseGuards(LenderScopeGuard)
export class LenderDashboardController {
  constructor(
    private readonly getLenderDashboardUseCase: GetLenderDashboardUseCase,
    private readonly getLenderStatsUseCase: GetLenderStatsUseCase,
    private readonly getLenderStatsExportUseCase: GetLenderStatsExportUseCase,
  ) {}

  /**
   * @param query - El período de lo cobrado, opcional, ya validado.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiGetLenderDashboard()
  async getLenderDashboard(
    @Query({ schema: GetLenderDashboardQuerySchema })
    query: z.output<typeof GetLenderDashboardQuerySchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LenderDashboardResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLenderDashboardResponse(
      await this.getLenderDashboardUseCase.execute(scope.lenderId, query),
    );
  }

  /**
   * @param query - El período y los filtros, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod('stats')
  @HttpCode(HttpStatus.OK)
  @ApiGetLenderStats()
  async getLenderStats(
    @Body({ schema: GetLenderStatsRequestSchema })
    query: z.output<typeof GetLenderStatsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LenderPeriodStatsResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLenderPeriodStatsResponse(
      await this.getLenderStatsUseCase.execute({
        lenderId: scope.lenderId,
        from: query.dateRange?.from,
        to: query.dateRange?.to,
        collectorMembershipId: query.collectorMembershipId,
        portfolioId: query.portfolioId,
        includePrevious: query.includePrevious,
      }),
    );
  }

  /**
   * Responde el PDF directo por `@Res()`, sin pasar por el pipeline normal de Nest: es la única
   * ruta de la API que no devuelve JSON.
   *
   * @param query - El período, los filtros y el formato, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   * @param res - Respuesta de Express, para escribir el PDF directamente.
   */
  @QueryMethod('stats/export')
  @HttpCode(HttpStatus.OK)
  @ApiGetLenderStatsExport()
  async getLenderStatsExport(
    @Body({ schema: GetLenderStatsExportRequestSchema })
    query: z.output<typeof GetLenderStatsExportRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
    @Res() res: Response,
  ): Promise<void> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    const { stats, lenderName } =
      await this.getLenderStatsExportUseCase.execute({
        lenderId: scope.lenderId,
        from: query.dateRange?.from,
        to: query.dateRange?.to,
        collectorMembershipId: query.collectorMembershipId,
        portfolioId: query.portfolioId,
      });
    const pdf = await renderLenderStatsPdf(stats, lenderName);
    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="estadisticas-${stats.from}-a-${stats.to}.pdf"`,
    );
    res.end(pdf);
  }
}
