import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { buildDashboardAlerts } from '@/modules/dashboard/domain/dashboard-alerts.js';
import type { LenderDashboard } from '@/modules/dashboard/application/dtos/lender-dashboard.dto.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { SettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

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
 * cálculo aquí — `ListLoansUseCase`/`GetLoanBalanceUseCase` (`loans`/`collections`) para la
 * cartera y la mora, y `ListSettlementsUseCase` (`settlements`) para los cuadres `PENDING`. No
 * compone `notifications`: las alertas son de lectura, no generan un aviso nuevo. Sin caché
 * todavía — cada apertura del resumen recalcula todo; si el número de cobradores o préstamos
 * activos crece mucho, esta es la primera ruta que necesitaría una.
 */
@Injectable()
export class GetLenderDashboardUseCase {
  constructor(
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly getCollectorDailySummary: GetCollectorDailySummaryUseCase,
    private readonly listLoans: ListLoansUseCase,
    private readonly getLoanBalance: GetLoanBalanceUseCase,
    private readonly listSettlements: ListSettlementsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param lenderId - El prestamista con el que opera la sesión. */
  async execute(lenderId: string): Promise<LenderDashboard> {
    const today = toBusinessDate(this.clock.now());
    const [
      { total: totalCollectors, activeIds },
      portfolio,
      pendingSettlements,
    ] = await Promise.all([
      this.collectorCounts(lenderId),
      this.portfolioAndArrears(lenderId),
      this.pendingSettlements(lenderId),
    ]);

    const summaries = await Promise.all(
      activeIds.map((collectorMembershipId) =>
        this.getCollectorDailySummary.execute({
          collectorMembershipId,
          lenderId,
          date: today,
        }),
      ),
    );
    const collectedToday = sumBy(summaries, (s) => s.collectedAmount);
    const expectedToday = sumBy(summaries, (s) => s.expectedAmount);
    const settlementsWithDifferences = pendingSettlements.filter(
      (settlement) => settlement.collectedAmount !== settlement.expectedAmount,
    ).length;

    return {
      totalPortfolio: portfolio.totalPortfolio,
      collectedToday,
      activeCollectors: activeIds.length,
      totalCollectors,
      effectivenessToday:
        expectedToday === 0 ? null : collectedToday / expectedToday,
      clientsInArrears: portfolio.clientsInArrears,
      alerts: buildDashboardAlerts({
        collectorsWithoutRouteStarted: summaries.filter(
          (s) => s.visits.length === 0,
        ).length,
        settlementsWithDifferences,
      }),
      pendingSettlements,
    };
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

  /** @returns El saldo total y los clientes distintos con mora, de los préstamos `ACTIVE`. */
  private async portfolioAndArrears(lenderId: string): Promise<{
    readonly totalPortfolio: number;
    readonly clientsInArrears: number;
  }> {
    const loans = await fetchAllPages<LoanDetails>(PAGE_SIZE, (page) =>
      this.listLoans.execute({
        lenderId,
        status: 'ACTIVE',
        page,
        pageSize: PAGE_SIZE,
      }),
    );
    const clientsInArrears = new Set<string>();
    const balances = await Promise.all(
      loans.map(async (loan) => {
        const balance = await this.getLoanBalance.execute(loan.id, lenderId);
        if (balance.overdueAmount > 0) {
          clientsInArrears.add(loan.clientId);
        }
        return balance;
      }),
    );
    return {
      totalPortfolio: sumBy(balances, (balance) => balance.balance),
      clientsInArrears: clientsInArrears.size,
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
