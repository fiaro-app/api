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
