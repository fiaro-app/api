import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { GetLoanInstallmentsUseCase } from '@/modules/collections/application/use-cases/get-loan-installments.use-case.js';
import { ApiGetLoanInstallments } from '@/modules/collections/infrastructure/controllers/docs/loan-installments-routes.docs.js';
import {
  toLoanInstallmentsResponse,
  type LoanInstallmentsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/loan-installments-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';
import { RestrictCollectorTo } from '@/shared/infrastructure/http/restrict-collector.decorator.js';

/**
 * Calendario de cuotas de un préstamo del prestamista con el que opera la sesión. Exige
 * `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué Lender operar.
 *
 * @remarks
 * Cuelga de `/loans/:loanId/installments` y vive en `collections`, junto al saldo, por la misma
 * razón (D-84): necesita los pagos de las visitas y `loans` no puede depender de `collections`.
 * Cualquier rol puede verlo: no hay un `if` de rol aquí.
 */
@ApiTags(API_TAGS.loan.name)
@Controller('loans/:loanId/installments')
@UseGuards(LenderScopeGuard)
export class LoanInstallmentsController {
  constructor(
    private readonly getLoanInstallmentsUseCase: GetLoanInstallmentsUseCase,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get()
  @RestrictCollectorTo('loan')
  @HttpCode(HttpStatus.OK)
  @ApiGetLoanInstallments()
  async getLoanInstallments(
    @Param('loanId', { schema: z.uuid() }) loanId: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanInstallmentsResponseSchema>> {
    return toLoanInstallmentsResponse(
      await this.getLoanInstallmentsUseCase.execute(loanId, scope.lenderId),
    );
  }
}
