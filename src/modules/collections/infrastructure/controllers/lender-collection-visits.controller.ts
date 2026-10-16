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
import { SummarizeCollectionRoutesUseCase } from '@/modules/collections/application/use-cases/summarize-collection-routes.use-case.js';
import { SearchCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/search-collection-visits.use-case.js';
import {
  ApiSearchCollectionRoutes,
  ApiSearchCollectionVisits,
} from '@/modules/collections/infrastructure/controllers/docs/collection-visit-report-routes.docs.js';
import {
  SearchCollectionRoutesRequestSchema,
  SearchCollectionVisitsRequestSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-report-requests.schema.js';
import {
  toCollectionRoutesResponse,
  toCollectionVisitReportResponse,
  type CollectionRoutesResponseSchema,
  type CollectionVisitReportResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-report-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden ver los cobros de todo el negocio (PRODUCT.md §5). */
const VIEWER_ROLES = ['OWNER', 'LENDER'];

/**
 * Las visitas de cobro vistas desde el prestamista, no desde un préstamo: la pantalla «Cobros
 * del día». Exige `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué
 * Lender operar.
 *
 * @remarks
 * Vive junto a `CollectionVisitController` (que cuelga de `/loans/:loanId/collection-visits`)
 * pero en su propio controller: este agrega a todo el negocio, así que exige `OWNER` o `LENDER`
 * como el resto de las vistas de negocio; un cobrador sigue viendo solo lo suyo, por su ruta y su
 * resumen (D-98).
 */
@ApiTags(API_TAGS.collectionVisit.name)
@Controller('collection-visits')
@UseGuards(LenderScopeGuard)
export class LenderCollectionVisitsController {
  constructor(
    private readonly searchCollectionVisitsUseCase: SearchCollectionVisitsUseCase,
    private readonly summarizeCollectionRoutesUseCase: SummarizeCollectionRoutesUseCase,
  ) {}

  /**
   * @param query - Rango, filtros y paginación, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiSearchCollectionVisits()
  async searchCollectionVisits(
    @Body({ schema: SearchCollectionVisitsRequestSchema })
    query: z.output<typeof SearchCollectionVisitsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectionVisitReportResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    const result = await this.searchCollectionVisitsUseCase.execute({
      lenderId: scope.lenderId,
      from: query.dateRange?.from,
      to: query.dateRange?.to,
      collectorMembershipId: query.collectorMembershipId,
      portfolioId: query.portfolioId,
      outcome: query.outcome,
      page: query.page,
      pageSize: query.pageSize,
    });
    return toCollectionVisitReportResponse(result, query);
  }

  /**
   * @param query - Rango, filtros y paginación, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod('routes')
  @HttpCode(HttpStatus.OK)
  @ApiSearchCollectionRoutes()
  async searchCollectionRoutes(
    @Body({ schema: SearchCollectionRoutesRequestSchema })
    query: z.output<typeof SearchCollectionRoutesRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectionRoutesResponseSchema>> {
    if (!hasAnyRole(scope.roles, VIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    const result = await this.summarizeCollectionRoutesUseCase.execute({
      lenderId: scope.lenderId,
      from: query.dateRange?.from,
      to: query.dateRange?.to,
      collectorMembershipId: query.collectorMembershipId,
      portfolioId: query.portfolioId,
      page: query.page,
      pageSize: query.pageSize,
    });
    return toCollectionRoutesResponse(result, query);
  }
}
