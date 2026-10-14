import { addDays } from '@/shared/domain/calendar/business-date.js';
import {
  nextWorkingDayOnOrAfter,
  type WorkingDayRules,
} from '@/shared/domain/calendar/working-day.js';

/**
 * Repite `LoanFrequency` de `modules/loans/domain`: el dominio compartido no importa el de un
 * módulo (regla de dependencia, ARCHITECTURE.md §3), así que lo repite, mismo criterio que
 * `Weekday` en `shared/domain/value-objects/weekday.ts`.
 */
export type LoanScheduleFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/** Cada cuántos días naturales cae una cuota, para las frecuencias de intervalo fijo. */
const FIXED_PERIOD_DAYS: Record<'WEEKLY' | 'BIWEEKLY', number> = {
  WEEKLY: 7,
  BIWEEKLY: 15,
};

/** Datos de un préstamo necesarios para calcular sus fechas esperadas de cobro. */
export interface LoanScheduleInput extends WorkingDayRules {
  /** Fecha `AAAA-MM-DD` en que arranca el préstamo. */
  readonly startDate: string;
  readonly frequency: LoanScheduleFrequency;
  /** Número de cuotas pactadas: cuántas fechas se calculan. */
  readonly installmentCount: number;
}

/**
 * El mismo día del mes que `isoDate`, `months` meses después; si ese día no existe en el mes de
 * llegada (por ejemplo, el 31 en un mes de 30), usa el último día de ese mes (D-35).
 *
 * @param isoDate - Fecha `AAAA-MM-DD` de partida.
 * @param months - Meses a sumar (siempre positivo, aquí).
 */
function addMonthsClamped(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const firstOfTargetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      clampedDay,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

/**
 * Fechas esperadas de cobro de un préstamo, una por cuota, de la más próxima a la más lejana. No
 * se materializan en ninguna tabla (PRODUCT.md §5): se recalculan cada vez que hacen falta.
 *
 * @remarks
 * `DAILY` no es un intervalo fijo que a veces se corre: es, literalmente, "cada día de cobro del
 * prestamista" (la propia `LoanFrequencySchema` de `contracts` lo dice así), así que la primera
 * cuota es el primer día de cobro después de `startDate`, la segunda el siguiente, y así. Las
 * demás frecuencias sí son un intervalo de días naturales fijo desde `startDate` (7, 15, o "el
 * mismo día del mes") que solo se corre al siguiente día de cobro cuando esa fecha puntual cae
 * en uno sin cobro (D-35); los días alrededor de una fecha corrida siguen sin ser de cobro.
 *
 * @param input - Fecha de arranque, frecuencia, número de cuotas y días sin cobro del
 * prestamista.
 * @throws {@link RangeError} Ver {@link nextWorkingDayOnOrAfter}: el prestamista no tiene ningún
 * día de cobro.
 */
export function computeExpectedInstallmentDates(
  input: LoanScheduleInput,
): readonly string[] {
  if (input.frequency === 'DAILY') {
    const dates: string[] = [];
    let cursor = input.startDate;
    while (dates.length < input.installmentCount) {
      cursor = nextWorkingDayOnOrAfter(addDays(cursor, 1), input);
      dates.push(cursor);
    }
    return dates;
  }

  const dates: string[] = [];
  for (
    let installment = 1;
    installment <= input.installmentCount;
    installment++
  ) {
    const naturalDate =
      input.frequency === 'MONTHLY'
        ? addMonthsClamped(input.startDate, installment)
        : addDays(
            input.startDate,
            installment * FIXED_PERIOD_DAYS[input.frequency],
          );
    dates.push(nextWorkingDayOnOrAfter(naturalDate, input));
  }
  return dates;
}
