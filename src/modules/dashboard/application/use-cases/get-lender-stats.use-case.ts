import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import type {
  GetLenderStatsInput,
  LenderPeriodStats,
  LenderPreviousPeriodStats,
  LenderStatsCollectorPerformance,
  LenderStatsTopArrearsEntry,
} from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import {
  LoanPortfolioSnapshotService,
  type LoanStatsRecord,
} from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import {
  bucketArrearsByAge,
  rankTopArrears,
  summarizePortfolio,
  totalCollection,
} from '@/modules/dashboard/domain/arrears-stats.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import {
  previousPeriod,
  startOfBusinessMonth,
} from '@/shared/domain/calendar/business-date.js';

const PAGE_SIZE = 100;
/** Cuántos clientes como máximo trae el ranking de mayor mora (PROTOTIPO-FLUJOS.md §4.9). */
const TOP_ARREARS_LIMIT = 10;

/** Un préstamo de la cartera con la cartera (zona) del cobrador que lo tiene asignado. */
type FilterableRecord = LoanStatsRecord & {
  readonly portfolioId: string | null;
};

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
 * D-98) tal cual. Con `includePrevious` repite lo mismo para el período anterior de la misma
 * duración (D-111): la cartera y la mora a su cierre, lo cobrado y lo esperado en sus días. Para
 * ese período, lo esperado sigue siendo el de los préstamos que cada cobrador tiene asignados hoy
 * (D-98), igual que en el período actual, para que la comparación sea de lo mismo con lo mismo.
 */
@Injectable()
export class GetLenderStatsUseCase {
  constructor(
    private readonly snapshots: LoanPortfolioSnapshotService,
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly getCollectorStats: GetCollectorStatsUseCase,
    private readonly getClient: GetClientUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista, el período (el mes actual, si no llega) y los filtros. */
  async execute(input: GetLenderStatsInput): Promise<LenderPeriodStats> {
    const today = toBusinessDate(this.clock.now());
    const period = {
      from: input.from ?? startOfBusinessMonth(today),
      to: input.to ?? today,
    };

    const collectors = await this.activeCollectors(input.lenderId);
    const relevant = this.relevantCollectors(collectors, input);
    const filtered = this.applyFilters(
      await this.snapshots.current(input.lenderId, today),
      collectors,
      input,
    );
    const overdue = filtered.filter((record) => record.overdueAmount > 0);
    const [topArrears, periodStats, previous] = await Promise.all([
      this.resolveTopArrears(overdue, input.lenderId),
      this.collectorStats(relevant, input.lenderId, period),
      input.includePrevious === true
        ? this.previousPeriodStats(input, collectors, relevant, period)
        : null,
    ]);

    return {
      ...period,
      ...summarizePortfolio(filtered),
      arrearsByAge: bucketArrearsByAge(overdue),
      topArrears,
      collectorPerformance: relevant.map((collector, index) =>
        toPerformance(collector, periodStats[index]),
      ),
      ...totalCollection(periodStats),
      previous,
    };
  }

  /** @returns El período anterior de la misma duración, con la cartera a su cierre. */
  private async previousPeriodStats(
    input: GetLenderStatsInput,
    collectors: readonly MembershipListEntry[],
    relevant: readonly MembershipListEntry[],
    period: { readonly from: string; readonly to: string },
  ): Promise<LenderPreviousPeriodStats> {
    const previous = previousPeriod(period);
    const [records, stats] = await Promise.all([
      this.snapshots.asOf(input.lenderId, previous.to),
      this.collectorStats(relevant, input.lenderId, previous),
    ]);
    return {
      ...previous,
      ...summarizePortfolio(this.applyFilters(records, collectors, input)),
      ...totalCollection(stats),
    };
  }

  /** @returns Las membresías `COLLECTOR` activas del prestamista. */
  private async activeCollectors(
    lenderId: string,
  ): Promise<readonly MembershipListEntry[]> {
    return fetchAllPages<MembershipListEntry>(PAGE_SIZE, (page) =>
      this.listMemberships.execute({
        lenderId,
        role: 'COLLECTOR',
        status: 'ACTIVE',
        page,
        pageSize: PAGE_SIZE,
      }),
    );
  }

  /** @returns Los préstamos que cumplen `collectorMembershipId` y `portfolioId`, si llegaron. */
  private applyFilters(
    records: readonly LoanStatsRecord[],
    collectors: readonly MembershipListEntry[],
    input: GetLenderStatsInput,
  ): readonly FilterableRecord[] {
    const portfolioById = new Map(
      collectors.map((collector) => [collector.id, collector.portfolioId]),
    );
    return records
      .map((record) => ({
        ...record,
        portfolioId:
          record.collectorMembershipId === null
            ? null
            : (portfolioById.get(record.collectorMembershipId) ?? null),
      }))
      .filter(
        (record) =>
          (input.collectorMembershipId === undefined ||
            record.collectorMembershipId === input.collectorMembershipId) &&
          (input.portfolioId === undefined ||
            record.portfolioId === input.portfolioId),
      );
  }

  /** @returns Los nombres de los clientes del ranking, resueltos solo para esos pocos. */
  private async resolveTopArrears(
    overdue: readonly LoanStatsRecord[],
    lenderId: string,
  ): Promise<readonly LenderStatsTopArrearsEntry[]> {
    const ranked = rankTopArrears(overdue, TOP_ARREARS_LIMIT);
    return Promise.all(
      ranked.map(async (entry) => ({
        ...entry,
        clientFullName: (await this.getClient.execute(entry.clientId, lenderId))
          .fullName,
      })),
    );
  }

  /** @returns Los cobradores activos que cumplen el filtro pedido (todos, si no hay filtro). */
  private relevantCollectors(
    collectors: readonly MembershipListEntry[],
    input: GetLenderStatsInput,
  ): readonly MembershipListEntry[] {
    if (input.collectorMembershipId !== undefined) {
      return collectors.filter((c) => c.id === input.collectorMembershipId);
    }
    if (input.portfolioId !== undefined) {
      return collectors.filter((c) => c.portfolioId === input.portfolioId);
    }
    return collectors;
  }

  /** @returns Las métricas del período de cada cobrador, en el mismo orden que `collectors`. */
  private async collectorStats(
    collectors: readonly MembershipListEntry[],
    lenderId: string,
    period: { readonly from: string; readonly to: string },
  ): Promise<readonly CollectorPeriodStats[]> {
    return Promise.all(
      collectors.map((collector) =>
        this.getCollectorStats.execute({
          collectorMembershipId: collector.id,
          lenderId,
          from: period.from,
          to: period.to,
        }),
      ),
    );
  }
}

/** @param collector - El cobrador. @param stats - Sus métricas del período. */
function toPerformance(
  collector: MembershipListEntry,
  stats: CollectorPeriodStats | undefined,
): LenderStatsCollectorPerformance {
  return {
    collectorMembershipId: collector.id,
    fullName: collector.fullName,
    effectiveness: stats?.effectiveness ?? null,
    overdueAmount: stats?.overdueAmount ?? 0,
  };
}
