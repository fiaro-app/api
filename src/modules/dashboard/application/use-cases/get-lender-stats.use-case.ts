import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import type {
  GetLenderStatsInput,
  LenderPeriodStats,
  LenderStatsCollectorPerformance,
  LenderStatsTopArrearsEntry,
} from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import {
  bucketArrearsByAge,
  rankTopArrears,
} from '@/modules/dashboard/domain/arrears-stats.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import { startOfBusinessMonth } from '@/shared/domain/calendar/business-date.js';

const PAGE_SIZE = 100;
/** Cuántos clientes como máximo trae el ranking de mayor mora (PROTOTIPO-FLUJOS.md §4.9). */
const TOP_ARREARS_LIMIT = 10;

/** Un préstamo `ACTIVE`, con su saldo y a quién tiene asignado hoy, antes de filtrar. */
interface LoanStatsRecord {
  readonly clientId: string;
  readonly balance: number;
  readonly overdueAmount: number;
  readonly overdueDays: number;
  readonly collectorMembershipId: string | null;
  readonly portfolioId: string | null;
}

/**
 * La salud de cartera y mora del negocio completo (PROTOTIPO-FLUJOS.md §4.9, D-100): la sección
 * que, según el prototipo, el usuario del proyecto marcó como la de mayor prioridad del
 * producto. Segunda pieza del "Dashboard de mora, saldo y efectividad de cobro" (PRODUCT.md §12)
 * del lado del Lender, junto al resumen de D-99.
 *
 * @remarks
 * Recorre los préstamos `ACTIVE` del prestamista una sola vez, resolviendo por cada uno su
 * asignación vigente hoy (`ListCollectionAssignmentsUseCase`, `collections`, filtrando
 * `effectiveFrom`/`effectiveTo` igual que `CollectionAssignmentRepository.findActiveByCollectorAndDate`,
 * que `dashboard` no puede llamar directamente — regla de fronteras, ARCHITECTURE.md §3) y la
 * cartera de ese cobrador (`Membership.portfolioId`). `collectorMembershipId`/`portfolioId` filtran
 * ese mismo recorrido en memoria, sin una consulta distinta por filtro: a la escala de la Fase 1
 * (un puñado de préstamos activos por prestamista) es más simple que mantener dos caminos de
 * datos separados, y "cartera total" sin filtros queda consistente con la de D-99. El desempeño
 * por cobrador reusa `GetCollectorStatsUseCase` (`collections`, D-98) tal cual, sin repetir su
 * cálculo de `effectiveness`/`overdueAmount`.
 */
@Injectable()
export class GetLenderStatsUseCase {
  constructor(
    private readonly listLoans: ListLoansUseCase,
    private readonly getLoanBalance: GetLoanBalanceUseCase,
    private readonly listCollectionAssignments: ListCollectionAssignmentsUseCase,
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly getCollectorStats: GetCollectorStatsUseCase,
    private readonly getClient: GetClientUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista, el período (el mes actual, si no llega) y los filtros. */
  async execute(input: GetLenderStatsInput): Promise<LenderPeriodStats> {
    const today = toBusinessDate(this.clock.now());
    const from = input.from ?? startOfBusinessMonth(today);
    const to = input.to ?? today;

    const [collectors, loanRecords] = await Promise.all([
      this.activeCollectors(input.lenderId),
      this.loanRecords(input.lenderId, today),
    ]);
    const portfolioById = new Map(
      collectors.map((collector) => [collector.id, collector.portfolioId]),
    );
    const records: LoanStatsRecord[] = loanRecords.map((record) => ({
      ...record,
      portfolioId:
        record.collectorMembershipId === null
          ? null
          : (portfolioById.get(record.collectorMembershipId) ?? null),
    }));
    const filtered = records.filter(
      (record) =>
        (input.collectorMembershipId === undefined ||
          record.collectorMembershipId === input.collectorMembershipId) &&
        (input.portfolioId === undefined ||
          record.portfolioId === input.portfolioId),
    );

    const totalPortfolio = sumBy(filtered, (record) => record.balance);
    const overdue = filtered.filter((record) => record.overdueAmount > 0);
    const portfolioAtRisk = sumBy(overdue, (record) => record.balance);
    const topArrears = await this.resolveTopArrears(overdue, input.lenderId);

    return {
      from,
      to,
      totalPortfolio,
      portfolioAtRisk,
      arrearsRate:
        totalPortfolio === 0 ? null : portfolioAtRisk / totalPortfolio,
      arrearsByAge: bucketArrearsByAge(overdue),
      topArrears,
      collectorPerformance: await this.collectorPerformance(
        this.relevantCollectors(collectors, input),
        input.lenderId,
        from,
        to,
      ),
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

  /**
   * @returns Los préstamos `ACTIVE`, con su saldo y el id de quien los tiene asignados hoy
   * (`null` si ninguno).
   */
  private async loanRecords(
    lenderId: string,
    today: string,
  ): Promise<readonly Omit<LoanStatsRecord, 'portfolioId'>[]> {
    const loans = await fetchAllPages<LoanDetails>(PAGE_SIZE, (page) =>
      this.listLoans.execute({
        lenderId,
        status: 'ACTIVE',
        page,
        pageSize: PAGE_SIZE,
      }),
    );
    return Promise.all(
      loans.map((loan) => this.toLoanRecord(loan, lenderId, today)),
    );
  }

  private async toLoanRecord(
    loan: LoanDetails,
    lenderId: string,
    today: string,
  ): Promise<Omit<LoanStatsRecord, 'portfolioId'>> {
    const [balance, assignments] = await Promise.all([
      this.getLoanBalance.execute(loan.id, lenderId),
      this.listCollectionAssignments.execute(loan.id, lenderId),
    ]);
    const current = assignments.find(
      (assignment) =>
        assignment.effectiveFrom <= today &&
        (assignment.effectiveTo === null || assignment.effectiveTo >= today),
    );
    return {
      clientId: loan.clientId,
      balance: balance.balance,
      overdueAmount: balance.overdueAmount,
      overdueDays: balance.overdueDays,
      collectorMembershipId: current?.collectorMembershipId ?? null,
    };
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

  private async collectorPerformance(
    collectors: readonly MembershipListEntry[],
    lenderId: string,
    from: string,
    to: string,
  ): Promise<readonly LenderStatsCollectorPerformance[]> {
    return Promise.all(
      collectors.map(async (collector) => {
        const stats = await this.getCollectorStats.execute({
          collectorMembershipId: collector.id,
          lenderId,
          from,
          to,
        });
        return {
          collectorMembershipId: collector.id,
          fullName: collector.fullName,
          effectiveness: stats.effectiveness,
          overdueAmount: stats.overdueAmount,
        };
      }),
    );
  }
}

function sumBy<T>(items: readonly T[], amount: (item: T) => number): number {
  return items.reduce((sum, item) => sum + amount(item), 0);
}
