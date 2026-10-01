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
