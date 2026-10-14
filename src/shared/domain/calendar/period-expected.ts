import { computeExpectedInstallmentDates } from '@/shared/domain/calendar/loan-schedule.js';
import type { LoanScheduleInput } from '@/shared/domain/calendar/loan-schedule.js';

/** Datos de un préstamo necesarios para saber cuánto de él vencía en un rango de fechas. */
export interface PeriodExpectedInput extends LoanScheduleInput {
  /** Valor de cada cuota, en pesos colombianos. Constante durante toda la vida del préstamo. */
  readonly installmentValue: number;
}

/**
 * Cuánto de un préstamo vencía dentro de un rango de fechas: la suma de sus cuotas cuya fecha
 * esperada ({@link computeExpectedInstallmentDates}) cae en `[from, to]`, ambos inclusive.
 *
 * @remarks
 * Es la base de "efectividad de cobro" (D-98): lo esperado es lo que el motor de calendario dice
 * que debía cobrarse en el período, no lo que las visitas registradas digan — así un cobrador no
 * puede mejorar su cifra simplemente dejando de visitar los casos difíciles. No filtra por si el
 * préstamo sigue `ACTIVE`: a quien llama le corresponde decidir si un préstamo `CANCELED` cuenta
 * (normalmente no) o uno `PAID_OFF` sigue contando lo que venció mientras estuvo activo
 * (normalmente sí).
 *
 * @param input - Fecha de arranque, frecuencia, cuotas, valor de cuota y días sin cobro del
 * prestamista.
 * @param from - Primera fecha del rango (`AAAA-MM-DD`), inclusive.
 * @param to - Última fecha del rango (`AAAA-MM-DD`), inclusive.
 */
export function computeExpectedAmountInRange(
  input: PeriodExpectedInput,
  from: string,
  to: string,
): number {
  const dates = computeExpectedInstallmentDates(input);
  const dueInRange = dates.filter((date) => date >= from && date <= to);
  return dueInRange.length * input.installmentValue;
}
