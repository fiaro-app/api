import { daysBetween } from '@/shared/domain/calendar/business-date.js';
import {
  computeExpectedInstallmentDates,
  type LoanScheduleInput,
} from '@/shared/domain/calendar/loan-schedule.js';

/** Datos de un préstamo y lo que lleva pagado, para calcular su estado financiero. */
export interface LoanBalanceInput extends LoanScheduleInput {
  /** Valor de cada cuota, en pesos colombianos. Constante durante toda la vida del préstamo. */
  readonly installmentValue: number;
  /** Lo pactado en total. */
  readonly totalPayable: number;
  /** Suma de los pagos recibidos hasta ahora (sin reversiones: `PaymentReversal` no existe todavía). */
  readonly totalPaid: number;
  /** Fecha `AAAA-MM-DD` con la que se calcula ("hoy", en la zona horaria del negocio). */
  readonly asOf: string;
  /** Si el préstamo ya está `PAID_OFF` o `CANCELED`: no le queda mora ni cuotas por venir. */
  readonly isClosed: boolean;
}

/** Estado financiero de un préstamo en un momento dado. */
export interface LoanBalance {
  /** `totalPayable` menos `totalPaid`; nunca baja de cero (un pago de más no genera saldo negativo). */
  readonly balance: number;
  /** Suma de las cuotas cuya fecha esperada ya llegó (`<= asOf`); cero si el préstamo ya cerró. */
  readonly totalExpectedToDate: number;
  /** Cuánto de `totalExpectedToDate` sigue sin pagar; cero si está al día o ya cerró. */
  readonly overdueAmount: number;
  /** Días desde la cuota impaga más antigua; cero si está al día o ya cerró. */
  readonly overdueDays: number;
  /**
   * Próxima fecha en la que se espera un pago: la cuota impaga más antigua si hay mora, o la
   * siguiente fecha futura si está al día. `null` si el préstamo ya cerró o no le quedan cuotas
   * por vencer.
   */
  readonly nextDueDate: string | null;
  /** Fecha de la cuota impaga más antigua; `null` si no hay mora. */
  readonly firstOverdueDate: string | null;
}

/** {@link LoanBalance} de un préstamo ya cerrado (`PAID_OFF` o `CANCELED`): sin mora ni cuotas. */
function closedLoanBalance(balance: number): LoanBalance {
  return {
    balance,
    totalExpectedToDate: 0,
    overdueAmount: 0,
    overdueDays: 0,
    nextDueDate: null,
    firstOverdueDate: null,
  };
}

/**
 * Calcula el saldo, la mora y la próxima fecha esperada de un préstamo activo, comparando sus
 * fechas esperadas de cobro ({@link computeExpectedInstallmentDates}) con lo que lleva pagado.
 *
 * @remarks
 * Como `installmentValue` es constante (no hay ruta para editar un préstamo, D-77) y no existe
 * todavía un resultado "parcial" como entidad propia (D-14: se deduce comparando montos), cuántas
 * cuotas están cubiertas por `totalPaid` se calcula dividiendo entre `installmentValue` y
 * redondeando hacia abajo: un pago parcial dentro de la cuota vigente no cuenta como esa cuota
 * pagada, y uno "de más" sí cubre la siguiente. `balance` se recorta en cero en vez de dejarlo
 * negativo: el producto no modela un saldo a favor del cliente (ninguna pantalla lo muestra), así
 * que un pago de más simplemente deja el préstamo al día.
 *
 * @param input - Datos del préstamo, lo pagado y la fecha de corte.
 * @returns El estado financiero del préstamo en `asOf`.
 * @throws {@link RangeError} Ver {@link computeExpectedInstallmentDates}.
 */
export function computeLoanBalance(input: LoanBalanceInput): LoanBalance {
  const balance = Math.max(0, input.totalPayable - input.totalPaid);

  if (input.isClosed) {
    return closedLoanBalance(balance);
  }

  const expectedDates = computeExpectedInstallmentDates(input);
  const dueDates = expectedDates.filter((date) => date <= input.asOf);
  const totalExpectedToDate = dueDates.length * input.installmentValue;
  const overdueAmount = Math.max(0, totalExpectedToDate - input.totalPaid);

  if (overdueAmount <= 0) {
    const nextDueDate = expectedDates.find((date) => date > input.asOf) ?? null;
    return {
      balance,
      totalExpectedToDate,
      overdueAmount: 0,
      overdueDays: 0,
      nextDueDate,
      firstOverdueDate: null,
    };
  }

  const paidInstallments = Math.floor(input.totalPaid / input.installmentValue);
  const firstOverdueDate = dueDates[paidInstallments];
  if (firstOverdueDate === undefined) {
    // Inalcanzable: `overdueAmount > 0` ya implica `totalPaid < dueDates.length *
    // installmentValue`, así que `paidInstallments < dueDates.length`. Un error claro es mejor
    // que una aserción no nula si alguna vez deja de cumplirse.
    throw new RangeError(
      'No se encontró la cuota impaga: estado de pagos inconsistente.',
    );
  }
  return {
    balance,
    totalExpectedToDate,
    overdueAmount,
    overdueDays: daysBetween(firstOverdueDate, input.asOf),
    nextDueDate: firstOverdueDate,
    firstOverdueDate,
  };
}
