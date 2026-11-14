import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  GetLenderStatsInput,
  LenderPeriodStats,
  LenderPreviousPeriodStats,
} from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import {
  filterStatsCollectors,
  filterStatsRecords,
  LenderStatsScope,
  toPerformance,
  type StatsPeriod,
} from '@/modules/dashboard/application/services/lender-stats-scope.js';
import { LoanPortfolioSnapshotService } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import {
  bucketArrearsByAge,
  rankTopArrears,
  summarizePortfolio,
  totalCollection,
} from '@/modules/dashboard/domain/arrears-stats.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import {
  previousPeriod,
  startOfBusinessMonth,
} from '@/shared/domain/calendar/business-date.js';

/**
 * Cuántas filas traen de entrada el ranking de mayor mora y el desempeño por cobrador: el resto se
 * pide paginado (`QUERY /lenders/me/stats/top-arrears` y `/collector-performance`).
 */
export const STATS_INITIAL_LIST_SIZE = 5;

/**
 * La salud de cartera y mora del negocio completo (PROTOTIPO-FLUJOS.md §4.9, D-100): la sección
 * que, según el prototipo, el usuario del proyecto marcó como la de mayor prioridad del
 * producto. Segunda pieza del "Dashboard de mora, saldo y efectividad de cobro" (PRODUCT.md §12)
 * del lado del Lender, junto al resumen de D-99.
 *
 * @remarks
 * Recorre los préstamos del prestamista una sola vez por fecha (`LoanPortfolioSnapshotService`),
 * con su asignación vigente ese día y la cartera de ese cobrador (`Membership.portfolioId`).
 * `collectorMembershipId`/`portfolioId` filtran ese mismo recorrido en memoria, sin una consulta
 * distinta por filtro. El desempeño por cobrador reusa `GetCollectorStatsUseCase` (`collections`,
 * D-98) tal cual; se calcula para todos (los totales los suman) pero la respuesta trae solo los
 * primeros {@link STATS_INITIAL_LIST_SIZE}, igual que el ranking de mora. Con `includePrevious` repite lo mismo para el período anterior de la misma
 * duración (D-111): la cartera y la mora a su cierre, lo cobrado y lo esperado en sus días. Para
 * ese período, lo esperado sigue siendo el de los préstamos que cada cobrador tiene asignados hoy
 * (D-98), igual que en el período actual, para que la comparación sea de lo mismo con lo mismo.
 */
@Injectable()
export class GetLenderStatsUseCase {
  constructor(
    private readonly snapshots: LoanPortfolioSnapshotService,
    private readonly scope: LenderStatsScope,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista, el período (el mes actual, si no llega) y los filtros.
   * @param listSize - Cuántas filas traen el ranking de mora y el desempeño (el PDF pide más).
   */
  async execute(
    input: GetLenderStatsInput,
    listSize: number = STATS_INITIAL_LIST_SIZE,
  ): Promise<LenderPeriodStats> {
    const today = toBusinessDate(this.clock.now());
    const period = {
      from: input.from ?? startOfBusinessMonth(today),
      to: input.to ?? today,
    };

    const collectors = await this.scope.activeCollectors(input.lenderId);
    const relevant = filterStatsCollectors(collectors, input);
    const filtered = filterStatsRecords(
      await this.snapshots.current(input.lenderId, today),
      collectors,
      input,
    );
    const overdue = filtered.filter((record) => record.overdueAmount > 0);
    const [topArrears, periodStats, previous] = await Promise.all([
      this.scope.withClientNames(
        rankTopArrears(overdue, listSize),
        input.lenderId,
      ),
      this.scope.collectorStats(relevant, input.lenderId, period),
      input.includePrevious === true
        ? this.previousPeriodStats(input, collectors, relevant, period)
        : null,
    ]);

    return {
      ...period,
      ...summarizePortfolio(filtered),
      arrearsByAge: bucketArrearsByAge(overdue),
      topArrears,
      collectorPerformance: relevant
        .slice(0, listSize)
        .map((collector, index) =>
          toPerformance(collector, periodStats[index]),
        ),
      ...totalCollection(periodStats),
      previous,
    };
  }

  /** La cartera y la mora al cierre del período anterior, y lo cobrado y esperado en sus días. */
  private async previousPeriodStats(
    input: GetLenderStatsInput,
    collectors: readonly MembershipListEntry[],
    relevant: readonly MembershipListEntry[],
    period: StatsPeriod,
  ): Promise<LenderPreviousPeriodStats> {
    const previous = previousPeriod(period);
    const [records, stats] = await Promise.all([
      this.snapshots.asOf(input.lenderId, previous.to),
      this.scope.collectorStats(relevant, input.lenderId, previous),
    ]);
    return {
      ...previous,
      ...summarizePortfolio(filterStatsRecords(records, collectors, input)),
      ...totalCollection(stats),
    };
  }
}
