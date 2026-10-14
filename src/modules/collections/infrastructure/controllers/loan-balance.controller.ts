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
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { ApiGetLoanBalance } from '@/modules/collections/infrastructure/controllers/docs/loan-balance-routes.docs.js';
import {
  toLoanBalanceResponse,
  type LoanBalanceResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/loan-balance-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Estado financiero (saldo, mora, próxima fecha esperada) de un préstamo del prestamista con el
 * que opera la sesión. Exige `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe
 * con qué Lender operar.
 *
 * @remarks
 * Cuelga de `/loans/:loanId/balance`, no de `LoanController`, porque el cálculo vive en
 * `collections` (necesita sumar los pagos de las visitas, que son de ese módulo) y `loans` no
 * puede depender de `collections` sin crear un ciclo de módulos (D-84). Cualquier rol puede
 * verlo, igual que `GET /loans/:id`: no hay un `if` de rol aquí.
 */
@ApiTags(API_TAGS.loan.name)
@Controller('loans/:loanId/balance')
@UseGuards(LenderScopeGuard)
export class LoanBalanceController {
  constructor(private readonly getLoanBalanceUseCase: GetLoanBalanceUseCase) {}

  /**
   * @param loanId - El préstamo.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiGetLoanBalance()
  async getLoanBalance(
    @Param('loanId', { schema: z.uuid() }) loanId: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanBalanceResponseSchema>> {
    return toLoanBalanceResponse(
      await this.getLoanBalanceUseCase.execute(loanId, scope.lenderId),
    );
  }
}
