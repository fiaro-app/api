import { Injectable } from '@nestjs/common';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import type {
  LenderStatsCollectorPerformance,
  LenderStatsTopArrearsEntry,
} from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import type { LoanStatsRecord } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { TopArrearsClient } from '@/modules/dashboard/domain/arrears-stats.js';

/** Páginas internas al leer todos los cobradores activos (no pasan por HTTP, no las limita el contrato). */
const PAGE_SIZE = 100;

/** Los filtros de las estadísticas que acotan préstamos y cobradores. */
export interface LenderStatsFilters {
  readonly collectorMembershipId?: string;
  readonly portfolioId?: string;
}

/** Un préstamo de la foto de la cartera, con la cartera de su cobrador para poder filtrarlo. */
export type FilterableRecord = LoanStatsRecord & {
  readonly portfolioId: string | null;
};

/** Un período de calendario, ambos extremos incluidos. */
export interface StatsPeriod {
  readonly from: string;
  readonly to: string;
}

/**
 * Lo que comparten las estadísticas del prestamista y sus listas paginadas (mayor mora y desempeño):
 * quiénes son sus cobradores activos, sus métricas de un período y los nombres del ranking.
 */
@Injectable()
export class LenderStatsScope {
  constructor(
    private readonly listMemberships: ListMembershipsUseCase,
    private readonly getCollectorStats: GetCollectorStatsUseCase,
    private readonly getClient: GetClientUseCase,
  ) {}

  /**
   * Las métricas de cada cobrador en el período, en el mismo orden.
   *
   * @param collectors - Los cobradores; se calcula uno por uno, así que conviene pasar solo los
   * que se van a mostrar.
   * @param lenderId - El prestamista.
   * @param period - El período.
   */
  async collectorStats(
    collectors: readonly MembershipListEntry[],
    lenderId: string,
    period: StatsPeriod,
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

  /**
   * Agrega el nombre del cliente a cada fila del ranking: una consulta por fila, por eso solo se
   * llama con la página que se va a mostrar.
   *
   * @param ranked - Las filas del ranking.
   * @param lenderId - El prestamista dueño de los clientes.
   */
  async withClientNames(
    ranked: readonly TopArrearsClient[],
    lenderId: string,
  ): Promise<readonly LenderStatsTopArrearsEntry[]> {
    return Promise.all(
      ranked.map(async (entry) => ({
        ...entry,
        clientFullName: (await this.getClient.execute(entry.clientId, lenderId))
          .fullName,
      })),
    );
  }

  /**
   * @param lenderId - El prestamista.
   * @returns Sus cobradores activos, del más antiguo al más nuevo.
   */
  async activeCollectors(
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
}

/**
 * Los préstamos que pasan los filtros: los del cobrador pedido y los de los cobradores de la
 * cartera pedida. La cartera de un préstamo es la de su cobrador de hoy.
 *
 * @param records - La foto de la cartera.
 * @param collectors - Los cobradores activos del prestamista.
 * @param filters - Cobrador y cartera, opcionales.
 */
export function filterStatsRecords(
  records: readonly LoanStatsRecord[],
  collectors: readonly MembershipListEntry[],
  filters: LenderStatsFilters,
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
        (filters.collectorMembershipId === undefined ||
          record.collectorMembershipId === filters.collectorMembershipId) &&
        (filters.portfolioId === undefined ||
          record.portfolioId === filters.portfolioId),
    );
}

/**
 * Los cobradores que pasan los filtros: el pedido, o los de la cartera pedida, o todos.
 *
 * @param collectors - Los cobradores activos del prestamista.
 * @param filters - Cobrador y cartera, opcionales.
 */
export function filterStatsCollectors(
  collectors: readonly MembershipListEntry[],
  filters: LenderStatsFilters,
): readonly MembershipListEntry[] {
  if (filters.collectorMembershipId !== undefined) {
    return collectors.filter((c) => c.id === filters.collectorMembershipId);
  }
  if (filters.portfolioId !== undefined) {
    return collectors.filter((c) => c.portfolioId === filters.portfolioId);
  }
  return collectors;
}

/**
 * La fila de desempeño de un cobrador.
 *
 * @param collector - El cobrador.
 * @param stats - Sus métricas del período.
 */
export function toPerformance(
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
