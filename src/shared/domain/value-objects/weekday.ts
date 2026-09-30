/**
 * Día de la semana, para los días sin cobro recurrentes de un prestamista y, más adelante, el
 * cálculo de fechas de cobro. Mismos siete valores que `WeekdaySchema` de `@fiaro-app/contracts`;
 * el dominio no importa el contrato (regla de dependencia, ARCHITECTURE.md §3), así que los
 * repite.
 */
export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';
