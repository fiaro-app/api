/**
 * Suma (o resta, con un número negativo) días de calendario a una fecha `AAAA-MM-DD`. Trabaja en
 * UTC para que la zona horaria del proceso nunca la corra un día, mismo criterio que `Loan.startDate`.
 *
 * @param isoDate - Fecha `AAAA-MM-DD`.
 * @param days - Días a sumar; negativo para restar.
 */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Días de calendario entre dos fechas `AAAA-MM-DD`: negativo si `fromIsoDate` es posterior a
 * `toIsoDate`. Mismo criterio UTC que {@link addDays}.
 *
 * @param fromIsoDate - Fecha de partida.
 * @param toIsoDate - Fecha de llegada.
 */
export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const from = new Date(`${fromIsoDate}T00:00:00Z`).getTime();
  const to = new Date(`${toIsoDate}T00:00:00Z`).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

/** El primer día del mes de una fecha `AAAA-MM-DD` ("este mes", el rango por defecto de los filtros de estadísticas). */
export function startOfBusinessMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** El instante exacto en que empieza y en que termina un día de calendario en Colombia. */
export interface BusinessDayInstants {
  /** El primer instante del día (00:00, hora de Bogotá). */
  readonly start: Date;
  /** El primer instante del día siguiente: el límite exclusivo del día. */
  readonly end: Date;
}

/**
 * Los límites, en instantes UTC reales, de una fecha de negocio (`AAAA-MM-DD`, hora de Bogotá):
 * para filtrar una columna `Timestamptz` (`occurredAt`, `createdAt`) por fecha de calendario sin
 * que la zona horaria del proceso la corra. Colombia no tiene horario de verano (D-82/D-96), así
 * que el offset `-05:00` es válido todo el año.
 *
 * @param isoDate - Fecha de calendario (`AAAA-MM-DD`), hora de Bogotá.
 */
export function businessDayInstants(isoDate: string): BusinessDayInstants {
  return {
    start: new Date(`${isoDate}T00:00:00-05:00`),
    end: new Date(`${addDays(isoDate, 1)}T00:00:00-05:00`),
  };
}

/**
 * Como {@link businessDayInstants}, pero para un rango de fechas completo (`from`/`to`
 * inclusive): el límite exclusivo es el día siguiente a `to`.
 *
 * @param from - Primera fecha del rango (`AAAA-MM-DD`), hora de Bogotá.
 * @param to - Última fecha del rango (`AAAA-MM-DD`), inclusive, hora de Bogotá.
 */
export function businessRangeInstants(
  from: string,
  to: string,
): BusinessDayInstants {
  return {
    start: businessDayInstants(from).start,
    end: businessDayInstants(to).end,
  };
}

/** Un rango de fechas de calendario, ambos extremos incluidos. */
export interface DatePeriod {
  /** Primera fecha (`AAAA-MM-DD`). */
  readonly from: string;
  /** Última fecha (`AAAA-MM-DD`). */
  readonly to: string;
}

/**
 * El período inmediatamente anterior y de la misma duración: para comparar, por ejemplo, este mes
 * hasta hoy contra los mismos días del tramo anterior. El de `2026-10-01` a `2026-10-09` (9 días)
 * es el de `2026-09-22` a `2026-09-30`.
 *
 * @remarks
 * Se mide en días corridos, no en meses calendario: un mes completo se compara con los mismos días
 * justo antes, no con "el mes pasado", que puede tener otra duración.
 *
 * @param period - El período actual (`from <= to`).
 */
export function previousPeriod(period: DatePeriod): DatePeriod {
  const length = daysBetween(period.from, period.to) + 1;
  const to = addDays(period.from, -1);
  return { from: addDays(to, -(length - 1)), to };
}
