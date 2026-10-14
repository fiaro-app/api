import { boundedDateRange, type DateRangeLimits } from '@fiaro-app/contracts';
import type { z } from 'zod';

/**
 * Cuántos días puede abarcar el período de cada consulta histórica, y si acepta fechas futuras.
 * Ninguna lo hace: lo cobrado, los cuadres y las estadísticas no tienen futuro.
 *
 * @remarks
 * - `visits` (93 días, un trimestre): el reporte de cobros recorre una fila por visita, la tabla
 *   que más crece; un trimestre cubre cualquier revisión operativa.
 * - `settlements` (366): un cuadre por cobrador y día, así que un año sigue siendo poco.
 * - `stats` (366): las cifras se agregan en la base de datos por préstamo; un año alcanza para
 *   comparar con el anterior (`includePrevious` lo duplica).
 * - `statsExport` (366): el PDF es la misma consulta que `stats`.
 *
 * Un informe más largo se pide por partes (un período por llamada).
 */
export const DATE_RANGE_LIMITS = {
  visits: { maxDays: 93 },
  settlements: { maxDays: 366 },
  stats: { maxDays: 366 },
  statsExport: { maxDays: 366 },
} as const satisfies Record<string, DateRangeLimits>;

/**
 * Para consultas que reciben `from` y `to` sueltos (en la query string) en lugar de un
 * `dateRange`: les aplica las mismas reglas que {@link boundedDateRange}, incluido el orden.
 *
 * @param range - `from` y `to`, si llegaron los dos.
 * @param limits - El largo máximo y si acepta fechas futuras.
 * @param ctx - El contexto del `superRefine` donde se reportan las fallas.
 */
export function addDateRangeIssues(
  range: { readonly from?: string; readonly to?: string },
  limits: DateRangeLimits,
  ctx: z.core.$RefinementCtx,
): void {
  if (range.from === undefined || range.to === undefined) {
    return;
  }
  const result = boundedDateRange(limits).safeParse({
    from: range.from,
    to: range.to,
  });
  for (const issue of result.error?.issues ?? []) {
    ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
  }
}
