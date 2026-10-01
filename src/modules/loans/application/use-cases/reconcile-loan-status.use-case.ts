import { Inject, Injectable } from '@nestjs/common';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type { LoanStatus } from '@/modules/loans/domain/entities/loan-status.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * El estado al que debería pasar un préstamo `ACTIVE` o `PAID_OFF` dado si ya está pagado del
 * todo, o `null` si el estado actual ya es el correcto.
 *
 * @param status - Estado actual (nunca `CANCELED`: eso ya lo filtra quien llama).
 * @param isFullyPaid - Si lo pagado de verdad cubre `totalPayable`.
 */
function nextLoanStatus(
  status: LoanStatus,
  isFullyPaid: boolean,
): LoanStatus | null {
  if (status === 'ACTIVE' && isFullyPaid) {
    return 'PAID_OFF';
  }
  if (status === 'PAID_OFF' && !isFullyPaid) {
    return 'ACTIVE';
  }
  return null;
}

/**
 * Mantiene el estado de un préstamo sincronizado con lo que de verdad se pagó: lo cierra a
 * `PAID_OFF` si el saldo llegó a cero, o lo reabre a `ACTIVE` si una reversión dejó saldo
 * pendiente en uno que ya estaba `PAID_OFF` (D-85). Nunca toca un préstamo `CANCELED`: ese estado
 * solo lo elige el prestamista (D-79), esta reconciliación no lo revierte.
 *
 * @remarks
 * Vive en `loans`, no en `collections`, porque escribe en `LoanRepository` (dominio de `loans`,
 * que `collections/application` no puede importar, regla de fronteras ARCHITECTURE.md §3).
 * `collections` calcula cuánto se pagó de verdad (sumando los pagos sin reversión,
 * `sumNetPayments`) y solo pasa el número: este caso de uso no conoce `Payment` ni
 * `PaymentReversal`. Vuelve a leer el préstamo en vez de confiar en uno que ya tenga quien lo
 * llama, para no actuar sobre un estado que haya quedado desactualizado.
 */
@Injectable()
export class ReconcileLoanStatusUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loans: LoanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param loanId - El préstamo.
   * @param lenderId - El prestamista dueño.
   * @param netTotalPaid - Suma de los pagos del préstamo que no tienen reversión.
   */
  async execute(
    loanId: string,
    lenderId: string,
    netTotalPaid: number,
  ): Promise<void> {
    const current = await this.loans.findById(loanId, lenderId);
    if (current === null || current.status === 'CANCELED') {
      return;
    }

    const isFullyPaid = netTotalPaid >= current.totalPayable;
    const nextStatus = nextLoanStatus(current.status, isFullyPaid);
    if (nextStatus === null) {
      return;
    }

    await this.loans.update(
      Loan.create({
        id: current.id,
        lenderId: current.lenderId,
        clientId: current.clientId,
        principalAmount: current.principalAmount,
        installmentCount: current.installmentCount,
        installmentValue: current.installmentValue,
        totalPayable: current.totalPayable,
        frequency: current.frequency,
        startDate: current.startDate,
        status: nextStatus,
        createdByMembershipId: current.createdByMembershipId,
        createdAt: current.createdAt,
        closedAt: nextStatus === 'PAID_OFF' ? this.clock.now() : null,
      }),
    );
  }
}
