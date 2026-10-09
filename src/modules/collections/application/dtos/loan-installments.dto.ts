import type { InstallmentStatus } from '@/shared/domain/calendar/loan-installments.js';

/** Una cuota del calendario de un préstamo. */
export interface LoanInstallmentDetails {
  /** Número de cuota, desde 1. */
  readonly number: number;
  /** Fecha `AAAA-MM-DD` en que se espera el pago. */
  readonly dueDate: string;
  /** Lo que debe pagarse en esta cuota. */
  readonly expectedAmount: number;
  /** Lo que ya se le imputó, entre cero y `expectedAmount`. */
  readonly paidAmount: number;
  readonly status: InstallmentStatus;
}

/** Calendario completo de cuotas de un préstamo, en el momento en que se consultó. */
export interface LoanInstallmentsDetails {
  /** El préstamo consultado. */
  readonly loanId: string;
  /** Fecha `AAAA-MM-DD` con la que se calculó. */
  readonly asOf: string;
  /** Las cuotas, de la primera a la última. */
  readonly installments: readonly LoanInstallmentDetails[];
}
