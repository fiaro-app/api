import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { LoanInstallmentsDetails } from '@/modules/collections/application/dtos/loan-installments.dto.js';
import { sumNetPayments } from '@/modules/collections/application/services/sum-net-payments.js';
import { toLoanScheduleInput } from '@/modules/collections/application/services/to-loan-schedule-input.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { COLLECTION_VISIT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import { computeLoanInstallments } from '@/shared/domain/calendar/loan-installments.js';

/**
 * Arma el calendario de cuotas de un préstamo del prestamista de la sesión: número, fecha,
 * monto esperado, monto pagado y estado de cada una. Cualquier rol puede verlo, igual que el
 * saldo.
 *
 * @remarks
 * Compone las mismas tres fuentes que {@link GetLoanBalanceUseCase} (el préstamo, los días sin
 * cobro del prestamista y los pagos netos de reversiones) y las pasa al motor puro de
 * `shared/domain/calendar`, que usa las mismas fechas esperadas que el saldo y la mora: el
 * calendario y el saldo nunca discrepan.
 */
@Injectable()
export class GetLoanInstallmentsUseCase {
  constructor(
    @Inject(COLLECTION_VISIT_REPOSITORY)
    private readonly visits: CollectionVisitRepository,
    private readonly getLoan: GetLoanUseCase,
    private readonly getLender: GetLenderUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Su calendario de cuotas, calculado con la fecha de hoy.
   * @throws {@link LoanNotFoundError} Si el préstamo no existe, o es de otro prestamista.
   */
  async execute(
    loanId: string,
    lenderId: string,
  ): Promise<LoanInstallmentsDetails> {
    const loan = await this.getLoan.execute(loanId, lenderId);
    const lender = await this.getLender.execute(lenderId);
    const records = await this.visits.listByLoan(loanId);
    const asOf = toBusinessDate(this.clock.now());

    const installments = computeLoanInstallments({
      ...toLoanScheduleInput(loan, lender),
      totalPaid: sumNetPayments(records),
      asOf,
      isClosed: loan.status !== 'ACTIVE',
    });

    return { loanId, asOf, installments };
  }
}
