import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreateCollectionVisitUseCase } from '@/modules/collections/application/use-cases/create-collection-visit.use-case.js';
import { ListCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/list-collection-visits.use-case.js';
import {
  ApiCreateCollectionVisit,
  ApiListCollectionVisits,
} from '@/modules/collections/infrastructure/controllers/docs/collection-visit-routes.docs.js';
import { CreateCollectionVisitRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-requests.schema.js';
import {
  toCollectionVisitResponse,
  toCollectionVisitsResponse,
  type CollectionVisitResponseSchema,
  type CollectionVisitsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Cobrar en campo es trabajo del rol `COLLECTOR` (PRODUCT.md §5); el operador que trabaja solo
 * ya lo tiene entre sus tres roles, así que no hace falta sumar `OWNER`/`LENDER` aquí.
 */
const COLLECTOR_ROLES = ['COLLECTOR'];

const LoanIdParamSchema = z.uuid();

/**
 * Visitas de cobro: la bitácora de campo de un préstamo del prestamista con el que opera la
 * sesión. Exige `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué Lender
 * operar.
 *
 * @remarks
 * Cuelga de `/loans/:loanId/collection-visits`, mismo criterio que
 * `CollectionAssignmentController` (D-82): el concepto vive en `collections`, no en `loans`. La
 * membresía que cobra es `scope.membershipId`, no un campo del cuerpo: el cobrador siempre
 * registra sus propias visitas. La validación de que esa membresía tenga una
 * `CollectionAssignment` vigente para este préstamo ("modo cobrador", D-74) vive en
 * `CreateCollectionVisitUseCase.assertCollectorAssigned`, no aquí (D-89); sin auditoría propia
 * todavía.
 */
@ApiTags(API_TAGS.collectionVisit.name)
@Controller('loans/:loanId/collection-visits')
@UseGuards(LenderScopeGuard)
export class CollectionVisitController {
  constructor(
    private readonly createCollectionVisitUseCase: CreateCollectionVisitUseCase,
    private readonly listCollectionVisitsUseCase: ListCollectionVisitsUseCase,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param body - El resultado, la hora y, si aplica, el pago, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCollectionVisit()
  async createCollectionVisit(
    @Param('loanId', { schema: LoanIdParamSchema }) loanId: string,
    @Body({ schema: CreateCollectionVisitRequestSchema })
    body: z.output<typeof CreateCollectionVisitRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectionVisitResponseSchema>> {
    if (!hasAnyRole(scope.roles, COLLECTOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toCollectionVisitResponse(
      await this.createCollectionVisitUseCase.execute({
        lenderId: scope.lenderId,
        loanId,
        collectorMembershipId: scope.membershipId,
        id: body.id,
        outcome: body.outcome,
        promisedDate: body.promisedDate,
        occurredAt: new Date(body.occurredAt),
        payment: body.payment,
      }),
    );
  }

  /**
   * @param loanId - El préstamo.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiListCollectionVisits()
  async listCollectionVisits(
    @Param('loanId', { schema: LoanIdParamSchema }) loanId: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectionVisitsResponseSchema>> {
    return toCollectionVisitsResponse(
      await this.listCollectionVisitsUseCase.execute(loanId, scope.lenderId),
    );
  }
}
