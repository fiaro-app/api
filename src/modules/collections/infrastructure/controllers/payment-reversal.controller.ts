import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreatePaymentReversalUseCase } from '@/modules/collections/application/use-cases/create-payment-reversal.use-case.js';
import { ApiCreatePaymentReversal } from '@/modules/collections/infrastructure/controllers/docs/payment-reversal-routes.docs.js';
import { CreatePaymentReversalRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/payment-reversal-requests.schema.js';
import {
  toPaymentReversalResponse,
  type PaymentReversalResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/payment-reversal-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Roles que pueden reversar un pago (D-16: "solo Lender"). Mismo criterio que crear un préstamo
 * o editar el prestamista (D-75/D-76/D-77): el texto suelto de PRODUCT.md ya se aclaró antes como
 * `OWNER` o `LENDER`, no el string literal `LENDER`.
 */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

/**
 * Reversiones de pago: la única forma de corregir un pago (PRODUCT.md §5, D-16). Exige
 * `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Cuelga de `/payments/:id/reversals`, no de `/loans/:loanId/...`: a diferencia de las
 * asignaciones y las visitas, un pago ya tiene un id propio y suficiente para encontrarlo sin
 * pasar por su préstamo primero (D-85).
 */
@ApiTags(API_TAGS.payment.name)
@Controller('payments/:id/reversals')
@UseGuards(LenderScopeGuard)
export class PaymentReversalController {
  constructor(
    private readonly createPaymentReversalUseCase: CreatePaymentReversalUseCase,
  ) {}

  /**
   * @param id - El pago.
   * @param body - El motivo, ya validado.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePaymentReversal()
  async createPaymentReversal(
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: CreatePaymentReversalRequestSchema })
    body: z.output<typeof CreatePaymentReversalRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof PaymentReversalResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toPaymentReversalResponse(
      await this.createPaymentReversalUseCase.execute({
        lenderId: scope.lenderId,
        paymentId: id,
        reason: body.reason,
        reversedByMembershipId: scope.membershipId,
      }),
    );
  }
}
