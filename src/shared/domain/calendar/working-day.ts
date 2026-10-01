import { addDays } from '@/shared/domain/calendar/business-date.js';
import { colombianHolidays } from '@/shared/domain/calendar/colombian-holidays.js';
import type { Weekday } from '@/shared/domain/value-objects/weekday.js';

/** `Weekday` de cada índice de `Date.getUTCDay()` (`0` es domingo). */
const WEEKDAY_BY_UTC_INDEX: readonly Weekday[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Cuántos días hacia adelante se busca un día de cobro antes de rendirse. Ningún préstamo real
 * necesita tanto: es una salvaguarda contra una configuración del prestamista sin ningún día de
 * cobro (ver {@link WorkingDayRules}), que sin este límite dejaría la búsqueda en un ciclo
 * infinito.
 */
export const MAX_WORKING_DAY_SEARCH_DAYS = 366;

/**
 * Los días sin cobro de un prestamista (PRODUCT.md §5): los de la semana que configura, y si
 * aplica, los festivos nacionales de Colombia. No incluye cierres puntuales (`NonWorkingDay`,
 * fechas sueltas): esa entidad todavía no existe en la API.
 */
export interface WorkingDayRules {
  /** Días de la semana en que no se cobra. */
  readonly nonWorkingWeekdays: readonly Weekday[];
  /** Si es `true`, los festivos nacionales de Colombia tampoco cuentan como días de cobro. */
  readonly skipNationalHolidays: boolean;
}

/** @param isoDate - Fecha `AAAA-MM-DD`. */
export function weekdayOf(isoDate: string): Weekday {
  const index = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  const weekday = WEEKDAY_BY_UTC_INDEX[index];
  if (weekday === undefined) {
    // `getUTCDay()` siempre da un índice de 0 a 6: el arreglo cubre los siete, así que esto nunca
    // debería pasar; si pasa, prefiere un error claro a seguir con un día de la semana inválido.
    throw new RangeError(
      `Índice de día de la semana fuera de rango: ${String(index)}.`,
    );
  }
  return weekday;
}

/**
 * Si `isoDate` es un día en que el prestamista cobra: ni uno de sus días de la semana sin cobro,
 * ni (si aplica) un festivo nacional.
 *
 * @param isoDate - Fecha `AAAA-MM-DD` a comprobar.
 * @param rules - Días sin cobro del prestamista.
 */
export function isWorkingDay(isoDate: string, rules: WorkingDayRules): boolean {
  if (rules.nonWorkingWeekdays.includes(weekdayOf(isoDate))) {
    return false;
  }
  if (rules.skipNationalHolidays) {
    const year = Number(isoDate.slice(0, 4));
    if (colombianHolidays(year).includes(isoDate)) {
      return false;
    }
  }
  return true;
}

/**
 * `isoDate` si ya es un día de cobro; si no, el primero después de él que sí lo es (D-35: "una
 * fecha que cae en día sin cobro pasa al siguiente día de cobro").
 *
 * @param isoDate - Fecha `AAAA-MM-DD` de partida.
 * @param rules - Días sin cobro del prestamista.
 * @throws {@link RangeError} Si no encuentra un día de cobro dentro de
 * {@link MAX_WORKING_DAY_SEARCH_DAYS} días: `nonWorkingWeekdays` cubre los siete días de la
 * semana, así que el prestamista no tiene ningún día de cobro (configuración inválida que el
 * contrato debería rechazar antes de llegar aquí).
 */
export function nextWorkingDayOnOrAfter(
  isoDate: string,
  rules: WorkingDayRules,
): string {
  let candidate = isoDate;
  for (let attempt = 0; attempt <= MAX_WORKING_DAY_SEARCH_DAYS; attempt++) {
    if (isWorkingDay(candidate, rules)) {
      return candidate;
    }
    candidate = addDays(candidate, 1);
  }
  throw new RangeError(
    `No se encontró un día de cobro en ${String(MAX_WORKING_DAY_SEARCH_DAYS)} días desde ${isoDate}: revisa los días sin cobro del prestamista.`,
  );
}
