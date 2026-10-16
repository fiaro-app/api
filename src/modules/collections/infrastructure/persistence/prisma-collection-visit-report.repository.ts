import { Injectable } from '@nestjs/common';
import type {
  CollectionVisitReportCriteria,
  CollectionVisitReportPage,
  CollectionVisitReportRepository,
  CollectionVisitReportRow,
  RouteDaySummary,
  RouteLogCriteria,
} from '@/modules/collections/domain/repositories/collection-visit-report.repository.js';
import { summarizeRouteDays } from '@/modules/collections/infrastructure/persistence/route-day-summary.js';
import { businessRangeInstants } from '@/shared/domain/calendar/business-date.js';
import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Lo que el reporte lee de cada visita, unido a su préstamo, cliente, cobrador y pago. */
const REPORT_SELECT = {
  id: true,
  occurredAt: true,
  outcome: true,
  expectedAmount: true,
  promisedDate: true,
  loan: {
    select: {
      id: true,
      client: { select: { id: true, fullName: true } },
    },
  },
  membership: {
    select: { id: true, user: { select: { fullName: true } } },
  },
  payment: {
    select: {
      id: true,
      amount: true,
      method: true,
      reversal: { select: { id: true } },
    },
  },
} satisfies Prisma.CollectionVisitSelect;

type ReportRecord = Prisma.CollectionVisitGetPayload<{
  select: typeof REPORT_SELECT;
}>;

/** @param record - La visita con lo que trae {@link REPORT_SELECT}. */
function toReportRow(record: ReportRecord): CollectionVisitReportRow {
  return {
    visitId: record.id,
    occurredAt: record.occurredAt,
    outcome: record.outcome,
    expectedAmount: record.expectedAmount,
    promisedDate: record.promisedDate,
    loanId: record.loan.id,
    clientId: record.loan.client.id,
    clientFullName: record.loan.client.fullName,
    collectorMembershipId: record.membership.id,
    collectorFullName: record.membership.user.fullName,
    payment:
      record.payment === null
        ? null
        : {
            id: record.payment.id,
            amount: record.payment.amount,
            method: record.payment.method,
            reversed: record.payment.reversal !== null,
          },
  };
}

/** @param criteria - Prestamista, fechas y filtros opcionales. */
function toWhere(
  criteria: CollectionVisitReportCriteria,
): Prisma.CollectionVisitWhereInput {
  const range = businessRangeInstants(criteria.from, criteria.to);
  return {
    loan: { lenderId: criteria.lenderId },
    occurredAt: { gte: range.start, lt: range.end },
    ...(criteria.outcome ? { outcome: criteria.outcome } : {}),
    ...(criteria.collectorMembershipId
      ? { collectorMembershipId: criteria.collectorMembershipId }
      : {}),
    ...(criteria.portfolioId
      ? { membership: { portfolioId: criteria.portfolioId } }
      : {}),
  };
}

/** Lo que el resumen de rutas lee de cada visita. */
const ROUTE_SELECT = {
  occurredAt: true,
  outcome: true,
  expectedAmount: true,
  collectorMembershipId: true,
  membership: { select: { user: { select: { fullName: true } } } },
  payment: { select: { amount: true, reversal: { select: { id: true } } } },
} satisfies Prisma.CollectionVisitSelect;

/** @param payment - El pago de la visita, si lo hubo. */
function collectedOf(
  payment: { amount: number; reversal: { id: string } | null } | null,
): number {
  return payment !== null && payment.reversal === null ? payment.amount : 0;
}

/** Lee las visitas de todo un prestamista de PostgreSQL con Prisma, en una sola consulta. */
@Injectable()
export class PrismaCollectionVisitReportRepository implements CollectionVisitReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param criteria - Prestamista, fechas, filtros opcionales y paginación. */
  async search(
    criteria: CollectionVisitReportCriteria,
  ): Promise<CollectionVisitReportPage> {
    const where = toWhere(criteria);
    const [records, total] = await this.prisma.$transaction([
      this.prisma.collectionVisit.findMany({
        where,
        select: REPORT_SELECT,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.collectionVisit.count({ where }),
    ]);
    return { items: records.map(toReportRow), total };
  }

  /** @param criteria - Prestamista, fechas y filtros opcionales. */
  async summarizeRoutes(
    criteria: RouteLogCriteria,
  ): Promise<readonly RouteDaySummary[]> {
    const records = await this.prisma.collectionVisit.findMany({
      where: toWhere({ ...criteria, page: 1, pageSize: 1 }),
      select: ROUTE_SELECT,
      orderBy: { occurredAt: 'asc' },
    });
    return summarizeRouteDays(
      records.map((record) => ({
        occurredAt: record.occurredAt,
        outcome: record.outcome,
        expectedAmount: record.expectedAmount,
        collectorMembershipId: record.collectorMembershipId,
        collectorFullName: record.membership.user.fullName,
        collectedAmount: collectedOf(record.payment),
      })),
    );
  }
}
