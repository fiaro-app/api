import type { CollectorRouteEntry } from '@/modules/collections/application/dtos/collector-route-entry.dto.js';

/**
 * Prioridad de una fila frente al resto de la ruta: mitad días de mora, mitad plata vencida,
 * cada una relativa al máximo del día (0 a 1). Así un cliente con muchos días pero poca deuda y
 * otro con poca mora pero mucha deuda quedan cerca, y ninguno de los dos criterios aplasta al
 * otro por tener otra escala (días vs. pesos).
 */
function priorityScore(
  entry: CollectorRouteEntry,
  maxDays: number,
  maxAmount: number,
): number {
  const days = maxDays > 0 ? entry.overdueDays / maxDays : 0;
  const amount = maxAmount > 0 ? entry.overdueAmount / maxAmount : 0;
  return 0.5 * days + 0.5 * amount;
}

/**
 * Ordena la ruta del día de lo más urgente a lo menos: primero los que aún no pagaron hoy, por
 * {@link priorityScore} descendente (desempate: nombre); al final, los que ya pagaron hoy, para no
 * estorbar al cobrador con quien ya visitó.
 *
 * @param entries - Las filas de la ruta, en cualquier orden.
 */
export function sortRouteByPriority(
  entries: readonly CollectorRouteEntry[],
): CollectorRouteEntry[] {
  const pending = entries.filter((entry) => entry.collectedToday === 0);
  const maxDays = Math.max(0, ...pending.map((entry) => entry.overdueDays));
  const maxAmount = Math.max(0, ...pending.map((entry) => entry.overdueAmount));
  const paid = (entry: CollectorRouteEntry) => Number(entry.collectedToday > 0);
  return [...entries].sort(
    (a, b) =>
      paid(a) - paid(b) ||
      priorityScore(b, maxDays, maxAmount) -
        priorityScore(a, maxDays, maxAmount) ||
      a.clientFullName.localeCompare(b.clientFullName),
  );
}
