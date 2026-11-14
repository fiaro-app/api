/**
 * Suma `months` meses de calendario a una fecha, sin pasarse del último día del mes de llegada:
 * 31 de enero más un mes es 28 (o 29) de febrero, no el 3 de marzo.
 *
 * @param from - Fecha de partida.
 * @param months - Meses a sumar.
 */
export function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * Dónde termina el período después de devolver un pago de `months` meses (D-156): se restan esos meses al
 * final vigente. Puede quedar en el pasado: el negocio entra en gracia o solo lectura como si no hubiera pagado.
 *
 * @param currentPeriodEndsAt - Hasta cuándo estaba pagado.
 * @param months - Meses del pago que se devuelve.
 */
export function retractPeriod(currentPeriodEndsAt: Date, months: number): Date {
  return addMonths(currentPeriodEndsAt, -months);
}

/**
 * Dónde termina el período después de pagar `months` meses: se suman al final del período vigente,
 * o a hoy si ya venció, así no se pierden los días que ya estaban pagados (ni los de la prueba).
 *
 * @param currentPeriodEndsAt - Hasta cuándo estaba pagado.
 * @param now - El momento en que se aprueba el pago.
 * @param months - Meses pagados.
 */
export function extendPeriod(
  currentPeriodEndsAt: Date,
  now: Date,
  months: number,
): Date {
  const base = currentPeriodEndsAt > now ? currentPeriodEndsAt : now;
  return addMonths(base, months);
}
