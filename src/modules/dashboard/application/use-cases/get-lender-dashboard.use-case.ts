import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import { totalCollection } from '@/modules/dashboard/domain/arrears-stats.js';
import { buildDashboardAlerts } from '@/modules/dashboard/domain/dashboard-alerts.js';
import type {
  LenderDashboard,
  LenderDashboardPeriod,
} from '@/modules/dashboard/application/dtos/lender-dashboard.dto.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import { LoanPortfolioSnapshotService } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { SettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import { effectivenessOf } from '@/shared/domain/effectiveness.js';

/** Cuántos registros se piden por página al recorrer un listado completo (D-96). */
const PAGE_SIZE = 100;

/**
 * El resumen del Lender al abrir la app (PROTOTIPO-FLUJOS.md §4.6, D-99): cartera, cobro de hoy,
 * cobradores, mora y alertas de texto. Primera pieza del lado del Lender del "Dashboard de mora,
 * saldo y efectividad de cobro" que PRODUCT.md §12 pide para la Fase 1 — la del cobrador (D-98)
 * ya estaba.
 *
 * @remarks
 * Compone, por la capa de aplicación, `GetCollectorDailySummaryUseCase` (`collections`, D-98) una
 * vez por cobrador activo para "cobrado hoy" y "efectividad general" — nunca se duplica ese
 * cálculo aquí — la foto de la cartera de las estadísticas (`LoanPortfolioSnapshotService`, en
 * tandas, D-119) para la cartera y la mora, y `ListSettlementsUseCase` (`settlements`) para los cuadres `PENDING`. Con un
 * período (D-111) suma también lo cobrado y lo esperado de esos días con `GetCollectorStatsUseCase`;
 * la cartera, la mora y los cuadres siguen siendo los de este momento, no los del período. No
 * compone `notifications`: las alertas son de lectura, no generan un aviso nuevo. El controlador lo
 * guarda en la caché de lecturas (D-118).
 */
@Injectable()
export class GetLenderDashboardUseCase {
  constructor(
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly getCollectorDailySummary: GetCollectorDailySummaryUseCase,
    private readonly getCollectorStats: GetCollectorStatsUseCase,
    private readonly snapshots: LoanPortfolioSnapshotService,
    private readonly listSettlements: ListSettlementsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param lenderId - El prestamista con el que opera la sesión.
   * @param requested - El período de las cifras `InPeriod`; ausente para solo hoy.
   */
  async execute(
    lenderId: string,
    requested: LenderDashboardPeriod = {},
  ): Promise<LenderDashboard> {
    const today = toBusinessDate(this.clock.now());
    const period = { from: requested.from ?? today, to: requested.to ?? today };
    const [
      { total: totalCollectors, activeIds },
      portfolio,
      pendingSettlements,
    ] = await Promise.all([
      this.collectorCounts(lenderId),
      this.portfolioAndArrears(lenderId, today),
      this.pendingSettlements(lenderId),
    ]);

    const summaries = await this.todaySummaries(activeIds, lenderId, today);
    const collectedToday = sumBy(summaries, (s) => s.collectedAmount);
    const expectedToday = sumBy(summaries, (s) => s.expectedAmount);
    const inPeriod =
      period.from === today && period.to === today
        ? totalCollection(summaries)
        : await this.collectionInPeriod(activeIds, lenderId, period);
    const settlementsWithDifferences = pendingSettlements.filter(
      (settlement) => settlement.collectedAmount !== settlement.expectedAmount,
    ).length;

    return {
      totalPortfolio: portfolio.totalPortfolio,
      collectedToday,
      activeCollectors: activeIds.length,
      totalCollectors,
      effectivenessToday: effectivenessOf(collectedToday, expectedToday),
      clientsInArrears: portfolio.clientsInArrears,
      alerts: buildDashboardAlerts({
        collectorsWithoutRouteStarted: summaries.filter(
          (s) => s.visits.length === 0,
        ).length,
        settlementsWithDifferences,
      }),
      pendingSettlements,
      period,
      collectedInPeriod: inPeriod.collectedAmount,
      expectedInPeriod: inPeriod.expectedAmount,
      effectivenessInPeriod: inPeriod.effectiveness,
    };
  }

  /** @returns El resumen del día de cada cobrador de `activeIds`. */
  private async todaySummaries(
    activeIds: readonly string[],
    lenderId: string,
    today: string,
  ) {
    return Promise.all(
      activeIds.map((collectorMembershipId) =>
        this.getCollectorDailySummary.execute({
          collectorMembershipId,
          lenderId,
          date: today,
        }),
      ),
    );
  }

  /** @returns Lo esperado y lo cobrado en el período, sumado entre los cobradores `activeIds`. */
  private async collectionInPeriod(
    activeIds: readonly string[],
    lenderId: string,
    period: { readonly from: string; readonly to: string },
  ) {
    const stats = await Promise.all(
      activeIds.map((collectorMembershipId) =>
        this.getCollectorStats.execute({
          collectorMembershipId,
          lenderId,
          from: period.from,
          to: period.to,
        }),
      ),
    );
    return totalCollection(stats);
  }

  /** @returns Cuántas membresías `COLLECTOR` hay en total, y el id de las que están `ACTIVE`. */
  private async collectorCounts(lenderId: string): Promise<{
    readonly total: number;
    readonly activeIds: readonly string[];
  }> {
    const totalPage = await this.listMemberships.execute({
      lenderId,
      role: 'COLLECTOR',
      page: 1,
      pageSize: 1,
    });
    const active = await fetchAllPages(PAGE_SIZE, (page) =>
      this.listMemberships.execute({
        lenderId,
        role: 'COLLECTOR',
        status: 'ACTIVE',
        page,
        pageSize: PAGE_SIZE,
      }),
    );
    return { total: totalPage.total, activeIds: active.map((m) => m.id) };
  }

  /** Cartera total y clientes con mora de hoy, de la foto de la cartera (en tandas, D-119). */
  private async portfolioAndArrears(
    lenderId: string,
    today: string,
  ): Promise<{
    readonly totalPortfolio: number;
    readonly clientsInArrears: number;
  }> {
    const records = await this.snapshots.current(lenderId, today);
    return {
      totalPortfolio: sumBy(records, (record) => record.balance),
      clientsInArrears: new Set(
        records
          .filter((record) => record.overdueAmount > 0)
          .map((record) => record.clientId),
      ).size,
    };
  }

  /** @returns Los cuadres `PENDING` del Lender. */
  private async pendingSettlements(
    lenderId: string,
  ): Promise<readonly SettlementDetails[]> {
    return fetchAllPages<SettlementDetails>(PAGE_SIZE, (page) =>
      this.listSettlements.execute({
        lenderId,
        status: 'PENDING',
        page,
        pageSize: PAGE_SIZE,
      }),
    );
  }
}

/** @param items - Lo que se suma. @param amount - Qué número de cada uno se suma. */
function sumBy<T>(items: readonly T[], amount: (item: T) => number): number {
  return items.reduce((sum, item) => sum + amount(item), 0);
}
