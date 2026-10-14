import { Inject, Injectable } from '@nestjs/common';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { toLoanDetails } from '@/modules/loans/application/dtos/loan-details.mapper.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import { LoanNotCancelableError } from '@/modules/loans/domain/errors/loan-not-cancelable.error.js';
import { LoanNotFoundError } from '@/modules/loans/domain/errors/loan-not-found.error.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Cancela un préstamo del prestamista de la sesión: lo anula por un error de registro, antes de
 * recibir pagos (PRODUCT.md §5). Quién puede llamarlo lo decide el controller (`hasAnyRole`,
 * mismo `OWNER`/`LENDER` que darlo de alta).
 *
 * @remarks
 * No comprueba todavía que el préstamo no tenga pagos: `payments` no existe aún, así que hoy la
 * condición siempre se cumple por construcción. Se agrega esa comprobación cuando el módulo
 * exista.
 */
@Injectable()
export class CancelLoanUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param id - El préstamo.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns El préstamo cancelado.
   * @throws {@link LoanNotFoundError} Si no existe, o es de otro prestamista.
   * @throws {@link LoanNotCancelableError} Si ya no está `ACTIVE`.
   */
  async execute(id: string, lenderId: string): Promise<LoanDetails> {
    const current = await this.loans.findById(id, lenderId);
    if (current === null) {
      throw new LoanNotFoundError(id);
    }
    if (current.status !== 'ACTIVE') {
      throw new LoanNotCancelableError();
    }

    const canceled = Loan.create({
      id: current.id,
      lenderId: current.lenderId,
      clientId: current.clientId,
      principalAmount: current.principalAmount,
      installmentCount: current.installmentCount,
      installmentValue: current.installmentValue,
      totalPayable: current.totalPayable,
      frequency: current.frequency,
      startDate: current.startDate,
      status: 'CANCELED',
      createdByMembershipId: current.createdByMembershipId,
      createdAt: current.createdAt,
      closedAt: this.clock.now(),
    });
    await this.loans.update(canceled);
    return toLoanDetails(canceled);
  }
}
