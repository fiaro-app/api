import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import type {
  CollectorsToday,
  CollectorTodayProgress,
} from '@/modules/dashboard/application/dtos/collectors-today.dto.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import {
  routeStatus,
  routeStatusOrder,
  type RouteStatus,
} from '@/modules/dashboard/domain/route-status.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/** Cuántos registros se piden por página al recorrer un listado completo. */
const PAGE_SIZE = 100;

/**
 * Cómo va hoy la ruta de cada cobrador activo: quién ya empezó, cuántos préstamos le faltan, cuánto
 * ha cobrado de lo esperado y si ya envió su cuadre. Pensado para que quien administra vea la
 * jornada en vivo, no solo el aviso «N cobradores aún no han iniciado su ruta».
 *
 * @remarks
 * Compone el resumen del día del cobrador (`GetCollectorDailySummaryUseCase`, el mismo que usa el
 * resumen del negocio, así las cifras nunca discrepan) y los cuadres de hoy
 * (`ListSettlementsUseCase`). No guarda nada.
 */
@Injectable()
export class GetCollectorsTodayUseCase {
  constructor(
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly getCollectorDailySummary: GetCollectorDailySummaryUseCase,
    private readonly listSettlements: ListSettlementsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param lenderId - El prestamista con el que opera la sesión. */
  async execute(lenderId: string): Promise<CollectorsToday> {
    const date = toBusinessDate(this.clock.now());
    const [collectors, settlements] = await Promise.all([
      fetchAllPages(PAGE_SIZE, (page) =>
        this.listMemberships.execute({
          lenderId,
          role: 'COLLECTOR',
          status: 'ACTIVE',
          page,
          pageSize: PAGE_SIZE,
        }),
      ),
      fetchAllPages(PAGE_SIZE, (page) =>
        this.listSettlements.execute({
          lenderId,
          from: date,
          to: date,
          page,
          pageSize: PAGE_SIZE,
        }),
      ),
    ]);
    const settlementOf = new Map(
      settlements.map((s) => [s.collectorMembershipId, s.status]),
    );
    const progress = await Promise.all(
      collectors.map((collector) =>
        this.progressOf(
          collector,
          lenderId,
          date,
          settlementOf.get(collector.id) ?? null,
        ),
      ),
    );
    return {
      date,
      counts: countByStatus(progress),
      collectors: progress.toSorted(
        (a, b) =>
          routeStatusOrder(a.status) - routeStatusOrder(b.status) ||
          b.pendingLoans - a.pendingLoans ||
          a.fullName.localeCompare(b.fullName),
      ),
    };
  }

  /**
   * @param collector - El cobrador activo.
   * @param lenderId - El prestamista dueño.
   * @param date - Hoy.
   * @param settlementStatus - Estado del cuadre que envió hoy, o `null`.
   */
  private async progressOf(
    collector: MembershipListEntry,
    lenderId: string,
    date: string,
    settlementStatus: CollectorTodayProgress['settlementStatus'],
  ): Promise<CollectorTodayProgress> {
    const summary = await this.getCollectorDailySummary.execute({
      collectorMembershipId: collector.id,
      lenderId,
      date,
    });
    return {
      membershipId: collector.id,
      fullName: collector.fullName,
      status: routeStatus(
        summary.routeLoans,
        summary.visitedLoans,
        summary.visits.length,
      ),
      routeLoans: summary.routeLoans,
      visitedLoans: summary.visitedLoans,
      pendingLoans: Math.max(summary.routeLoans - summary.visitedLoans, 0),
      expectedAmount: summary.expectedAmount,
      collectedAmount: summary.collectedAmount,
      firstVisitAt: summary.visits.at(0)?.occurredAt ?? null,
      lastVisitAt: summary.visits.at(-1)?.occurredAt ?? null,
      settlementStatus,
    };
  }
}

function countByStatus(
  progress: readonly CollectorTodayProgress[],
): Record<RouteStatus, number> {
  const counts: Record<RouteStatus, number> = {
    NO_ROUTE: 0,
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    FINISHED: 0,
  };
  for (const entry of progress) {
    counts[entry.status] += 1;
  }
  return counts;
}
