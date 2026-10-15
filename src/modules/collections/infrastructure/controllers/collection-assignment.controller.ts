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
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import {
  ApiCreateCollectionAssignment,
  ApiListCollectionAssignments,
} from '@/modules/collections/infrastructure/controllers/docs/collection-assignment-routes.docs.js';
import { CreateCollectionAssignmentRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collection-assignment-requests.schema.js';
import {
  toCollectionAssignmentResponse,
  toCollectionAssignmentsResponse,
  type CollectionAssignmentResponseSchema,
  type CollectionAssignmentsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-assignment-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';
import { RestrictCollectorTo } from '@/shared/infrastructure/http/restrict-collector.decorator.js';

/** Roles que pueden asignar un cobrador (mismo criterio que crear un préstamo, D-77). */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

const LoanIdParamSchema = z.uuid();

/**
 * Asignaciones de cobro: quién cobra cada préstamo del prestamista con el que opera la sesión.
 * Exige `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Cuelga de `/loans/:loanId/collection-assignments`, no de un controller propio de `loans`,
 * porque el concepto vive en `collections` (PRODUCT.md §5): `loans` no conoce cobradores ni
 * membresías. Sin auditoría propia todavía.
 */
@ApiTags(API_TAGS.collectionAssignment.name)
@Controller('loans/:loanId/collection-assignments')
@UseGuards(LenderScopeGuard)
export class CollectionAssignmentController {
  constructor(
    private readonly createCollectionAssignmentUseCase: CreateCollectionAssignmentUseCase,
    private readonly listCollectionAssignmentsUseCase: ListCollectionAssignmentsUseCase,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param body - El cobrador y las fechas de vigencia, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCollectionAssignment()
  async createCollectionAssignment(
    @Param('loanId', { schema: LoanIdParamSchema }) loanId: string,
    @Body({ schema: CreateCollectionAssignmentRequestSchema })
    body: z.output<typeof CreateCollectionAssignmentRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectionAssignmentResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toCollectionAssignmentResponse(
      await this.createCollectionAssignmentUseCase.execute({
        lenderId: scope.lenderId,
        loanId,
        ...body,
      }),
    );
  }

  /**
   * @param loanId - El préstamo.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get()
  @RestrictCollectorTo('loan')
  @HttpCode(HttpStatus.OK)
  @ApiListCollectionAssignments()
  async listCollectionAssignments(
    @Param('loanId', { schema: LoanIdParamSchema }) loanId: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof CollectionAssignmentsResponseSchema>> {
    return toCollectionAssignmentsResponse(
      await this.listCollectionAssignmentsUseCase.execute(
        loanId,
        scope.lenderId,
      ),
    );
  }
}
