import { toBusinessDate } from '@fiaro-app/contracts';
import type { RouteDaySummary } from '@/modules/collections/domain/repositories/collection-visit-report.repository.js';

/** Lo mínimo que se necesita de una visita para resumir la ruta del día. */
export interface RouteVisit {
  readonly occurredAt: Date;
  readonly outcome: string;
  readonly expectedAmount: number;
  readonly collectorMembershipId: string;
  readonly collectorFullName: string;
  /** Lo cobrado con esa visita, o 0 si no hubo pago o fue revertido. */
  readonly collectedAmount: number;
}

/**
 * Agrupa las visitas por cobrador y día de Bogotá: la primera y la última marcan cuándo empezó y terminó la
 * ruta. Del día más reciente al más antiguo y, dentro de un día, por nombre del cobrador.
 *
 * @param visits - Las visitas, de la más antigua a la más reciente.
 */
export function summarizeRouteDays(
  visits: readonly RouteVisit[],
): readonly RouteDaySummary[] {
  const days = new Map<string, RouteDaySummary>();
  for (const visit of visits) {
    const date = toBusinessDate(visit.occurredAt);
    const key = `${date}|${visit.collectorMembershipId}`;
    days.set(key, addVisit(days.get(key) ?? startDay(date, visit), visit));
  }
  return [...days.values()].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.collectorFullName.localeCompare(b.collectorFullName),
  );
}

/** @param visit - La primera visita del cobrador ese día. */
function startDay(date: string, visit: RouteVisit): RouteDaySummary {
  return {
    date,
    collectorMembershipId: visit.collectorMembershipId,
    collectorFullName: visit.collectorFullName,
    startedAt: visit.occurredAt,
    endedAt: visit.occurredAt,
    visitsCount: 0,
    paidCount: 0,
    expectedAmount: 0,
    collectedAmount: 0,
  };
}

/** @returns El día con la visita sumada; la visita también marca la hora en que terminó la ruta. */
function addVisit(day: RouteDaySummary, visit: RouteVisit): RouteDaySummary {
  return {
    ...day,
    endedAt: visit.occurredAt,
    visitsCount: day.visitsCount + 1,
    paidCount: day.paidCount + Number(visit.outcome === 'PAID'),
    expectedAmount: day.expectedAmount + visit.expectedAmount,
    collectedAmount: day.collectedAmount + visit.collectedAmount,
  };
}
