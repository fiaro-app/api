import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  QueryMethod,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CancelSettlementUseCase } from '@/modules/settlements/application/use-cases/cancel-settlement.use-case.js';
import { GetSettlementUseCase } from '@/modules/settlements/application/use-cases/get-settlement.use-case.js';
import { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import { ReviewSettlementUseCase } from '@/modules/settlements/application/use-cases/review-settlement.use-case.js';
import { SubmitSettlementUseCase } from '@/modules/settlements/application/use-cases/submit-settlement.use-case.js';
import {
  ApiGetSettlement,
  ApiListSettlements,
  apiReviewSettlement,
  ApiCancelSettlement,
  ApiSubmitSettlement,
} from '@/modules/settlements/infrastructure/controllers/docs/settlement-routes.docs.js';
import {
  ListSettlementsRequestSchema,
  ReviewSettlementRequestSchema,
  SubmitSettlementRequestSchema,
} from '@/modules/settlements/infrastructure/controllers/schemas/settlement-requests.schema.js';
import {
  toSettlementResponse,
  toSettlementsPageResponse,
  type SettlementResponseSchema,
  type SettlementsPageResponseSchema,
} from '@/modules/settlements/infrastructure/controllers/schemas/settlement-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { isCollectorOnly } from '@/shared/application/security/is-collector-only.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { AllowWhenReadOnly } from '@/shared/infrastructure/http/allow-when-read-only.decorator.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Rol que puede enviar un cuadre: siempre el propio, de quien cobra (PRODUCT.md §5). */
const SUBMITTER_ROLES = ['COLLECTOR'];

/** Roles que pueden revisar un cuadre (PRODUCT.md §5: "APPROVED/REJECTED por el Lender"). */
const REVIEWER_ROLES = ['OWNER', 'LENDER'];

const SettlementIdParamSchema = z.uuid();

/**
 * Cuadres diarios del prestamista con el que opera la sesión. Exige `LenderScopeGuard`, así que
 * corre después de `AuthGuard` y ya sabe con qué Lender operar sin leerlo del body ni del query.
 *
 * @remarks
 * `PERMISSIONS.md` (pendiente) tendrá la matriz completa; por ahora cada ruta decide su rol a
 * mano, mismo patrón que `LoanController`. Sin auditoría propia todavía; sin RLS todavía.
 */
@ApiTags(API_TAGS.dailySettlement.name)
@Controller('daily-settlements')
@UseGuards(LenderScopeGuard)
export class DailySettlementController {
  constructor(
    private readonly submitSettlementUseCase: SubmitSettlementUseCase,
    private readonly cancelSettlementUseCase: CancelSettlementUseCase,
    private readonly getSettlementUseCase: GetSettlementUseCase,
    private readonly listSettlementsUseCase: ListSettlementsUseCase,
    private readonly reviewSettlementUseCase: ReviewSettlementUseCase,
  ) {}

  /**
   * @param body - Los montos declarados, ya validados.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @AllowWhenReadOnly()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiSubmitSettlement()
  async submitSettlement(
    @Body({ schema: SubmitSettlementRequestSchema })
    body: z.output<typeof SubmitSettlementRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof SettlementResponseSchema>> {
    if (!hasAnyRole(scope.roles, SUBMITTER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toSettlementResponse(
      await this.submitSettlementUseCase.execute({
        lenderId: scope.lenderId,
        collectorMembershipId: scope.membershipId,
        expectedAmount: body.expectedAmount,
        collectedCash: body.collectedCash,
        collectedNequi: body.collectedNequi,
        collectedTransfer: body.collectedTransfer,
        collectorNote: body.collectorNote ?? null,
      }),
    );
  }

  /**
   * @param id - El cuadre.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @AllowWhenReadOnly()
  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCancelSettlement()
  async cancelSettlement(
    @Param('id', { schema: SettlementIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<void> {
    if (!hasAnyRole(scope.roles, SUBMITTER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    await this.cancelSettlementUseCase.execute({
      settlementId: id,
      lenderId: scope.lenderId,
      collectorMembershipId: scope.membershipId,
    });
  }

  /**
   * @param id - El cuadre.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiGetSettlement()
  async getSettlement(
    @Param('id', { schema: SettlementIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof SettlementResponseSchema>> {
    const settlement = await this.getSettlementUseCase.execute(
      id,
      scope.lenderId,
    );
    if (
      isCollectorOnly(scope.roles) &&
      settlement.collectorMembershipId !== scope.membershipId
    ) {
      throw new NotFoundException({ code: ErrorCodeSchema.enum.NOT_FOUND });
    }
    return toSettlementResponse(settlement);
  }

  /**
   * @param query - Página, tamaño y filtros opcionales, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiListSettlements()
  async listSettlements(
    @Body({ schema: ListSettlementsRequestSchema })
    query: z.output<typeof ListSettlementsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof SettlementsPageResponseSchema>> {
    const page = await this.listSettlementsUseCase.execute({
      lenderId: scope.lenderId,
      page: query.page,
      pageSize: query.pageSize,
      collectorMembershipId: isCollectorOnly(scope.roles)
        ? scope.membershipId
        : query.collectorMembershipId,
      status: query.status,
      portfolioId: query.portfolioId,
      from: query.dateRange?.from,
      to: query.dateRange?.to,
    });
    return toSettlementsPageResponse(page, query);
  }

  /**
   * @param id - El cuadre.
   * @param body - El comentario opcional, ya validado.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @AllowWhenReadOnly()
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @apiReviewSettlement('approve')
  async approveSettlement(
    @Param('id', { schema: SettlementIdParamSchema }) id: string,
    @Body({ schema: ReviewSettlementRequestSchema })
    body: z.output<typeof ReviewSettlementRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof SettlementResponseSchema>> {
    return this.review(id, 'APPROVED', body, scope);
  }

  /**
   * @param id - El cuadre.
   * @param body - El comentario opcional, ya validado.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @AllowWhenReadOnly()
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @apiReviewSettlement('reject')
  async rejectSettlement(
    @Param('id', { schema: SettlementIdParamSchema }) id: string,
    @Body({ schema: ReviewSettlementRequestSchema })
    body: z.output<typeof ReviewSettlementRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof SettlementResponseSchema>> {
    return this.review(id, 'REJECTED', body, scope);
  }

  private async review(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    body: z.output<typeof ReviewSettlementRequestSchema>,
    scope: LenderScope,
  ): Promise<z.output<typeof SettlementResponseSchema>> {
    if (!hasAnyRole(scope.roles, REVIEWER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toSettlementResponse(
      await this.reviewSettlementUseCase.execute({
        lenderId: scope.lenderId,
        settlementId: id,
        reviewerMembershipId: scope.membershipId,
        status,
        reviewNote: body.reviewNote ?? null,
      }),
    );
  }
}
