import {
  computeExpectedInstallmentDates,
  type LoanScheduleInput,
} from '@/shared/domain/calendar/loan-schedule.js';

/** Estado de una cuota del calendario de un préstamo. */
export type InstallmentStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING';

/** Datos de un préstamo y lo que lleva pagado, para armar su calendario de cuotas. */
export interface LoanInstallmentsInput extends LoanScheduleInput {
  /** Valor de cada cuota, en pesos colombianos. Constante durante toda la vida del préstamo. */
  readonly installmentValue: number;
  /** Suma neta de los pagos recibidos hasta ahora (sin los reversados). */
  readonly totalPaid: number;
  /** Fecha `AAAA-MM-DD` con la que se calcula ("hoy", en la zona horaria del negocio). */
  readonly asOf: string;
  /** Si el préstamo ya está `PAID_OFF` o `CANCELED`: ninguna cuota impaga cuenta como mora. */
  readonly isClosed: boolean;
}

/** Una fila del calendario de cuotas. */
export interface LoanInstallment {
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

/**
 * Arma el calendario completo de un préstamo: una fila por cuota, con lo esperado, lo pagado y su
 * estado, desde las mismas fechas esperadas que usan el saldo y la mora
 * ({@link computeExpectedInstallmentDates}).
 *
 * @remarks
 * Los pagos se imputan a las cuotas en orden, de la más antigua a la más nueva (la misma regla
 * con la que `computeLoanBalance` decide cuál es la cuota impaga más antigua), así que las
 * cifras de ambos siempre coinciden: la fila `OVERDUE` o `PARTIAL` más antigua es la que el saldo
 * reporta como `firstOverdueDate`. Estados: `PAID` si la cuota quedó cubierta; `PARTIAL` si tiene
 * algo imputado pero no todo; `OVERDUE` si no tiene nada, su fecha ya llegó (`<= asOf`, igual que
 * el saldo) y el préstamo sigue abierto; `PENDING` en cualquier otro caso (incluida una cuota
 * impaga de un préstamo ya cerrado, que no genera mora).
 *
 * @param input - Datos del préstamo, lo pagado y la fecha de corte.
 * @returns Las cuotas, de la primera a la última.
 * @throws {@link RangeError} Ver {@link computeExpectedInstallmentDates}.
 */
export function computeLoanInstallments(
  input: LoanInstallmentsInput,
): readonly LoanInstallment[] {
  const dueDates = computeExpectedInstallmentDates(input);
  let remainingPaid = Math.max(0, input.totalPaid);

  return dueDates.map((dueDate, index) => {
    const paidAmount = Math.min(remainingPaid, input.installmentValue);
    remainingPaid -= paidAmount;
    return {
      number: index + 1,
      dueDate,
      expectedAmount: input.installmentValue,
      paidAmount,
      status: installmentStatus(paidAmount, dueDate, input),
    };
  });
}

/**
 * @param paidAmount - Lo imputado a la cuota.
 * @param dueDate - Su fecha esperada.
 * @param input - Valor de cuota, fecha de corte y si el préstamo está cerrado.
 */
function installmentStatus(
  paidAmount: number,
  dueDate: string,
  input: Pick<LoanInstallmentsInput, 'installmentValue' | 'asOf' | 'isClosed'>,
): InstallmentStatus {
  if (paidAmount >= input.installmentValue) {
    return 'PAID';
  }
  if (paidAmount > 0) {
    return 'PARTIAL';
  }
  return !input.isClosed && dueDate <= input.asOf ? 'OVERDUE' : 'PENDING';
}
