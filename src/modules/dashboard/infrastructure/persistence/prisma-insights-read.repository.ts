import { Injectable } from '@nestjs/common';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type {
  IncomeTotals,
  InsightsReadRepository,
  OriginationTotals,
  SettlementAmounts,
} from '@/modules/dashboard/domain/repositories/insights-read.repository.js';
import type {
  InsightsPaymentMethod,
  PaymentDayRow,
  VisitOutcomeCounts,
} from '@/modules/dashboard/domain/insights.js';
import { businessRangeInstants } from '@/shared/domain/calendar/business-date.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * Las lecturas agregadas de las estadísticas, en SQL (D-133). Todo está acotado por `lender_id`
 * (a través del préstamo o de la membresía): nunca se mezclan datos de otro prestamista. Los
 * valores van como parámetros de `$queryRaw`, jamás concatenados.
 */
@Injectable()
export class PrismaInsightsReadRepository implements InsightsReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async paymentsByDay(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<readonly PaymentDayRow[]> {
    const { start, end } = businessRangeInstants(from, to);
    const rows = await this.prisma.$queryRaw<
      {
        day: string;
        method: InsightsPaymentMethod;
        amount: bigint;
        count: bigint;
      }[]
    >(Prisma.sql`
      SELECT to_char(p.occurred_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS day,
             p.method::text AS method,
             SUM(p.amount) AS amount,
             COUNT(*) AS count
        FROM payments p
        JOIN loans l ON l.id = p.loan_id
        LEFT JOIN payment_reversals r ON r.payment_id = p.id
       WHERE l.lender_id = ${lenderId}::uuid
         AND r.id IS NULL
         AND p.occurred_at >= ${start}
         AND p.occurred_at <= ${end}
       GROUP BY 1, 2
       ORDER BY 1, 2`);
    return rows.map((row) => ({
      date: row.day,
      method: row.method,
      amount: Number(row.amount),
      count: Number(row.count),
    }));
  }

  async income(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<IncomeTotals> {
    const { start, end } = businessRangeInstants(from, to);
    const [row] = await this.prisma.$queryRaw<
      { collected: bigint | null; interest: number | null }[]
    >(
      Prisma.sql`
      SELECT SUM(p.amount) AS collected,
             SUM(p.amount * (l.total_payable - l.principal_amount)::float8 / NULLIF(l.total_payable, 0)) AS interest
        FROM payments p
        JOIN loans l ON l.id = p.loan_id
        LEFT JOIN payment_reversals r ON r.payment_id = p.id
       WHERE l.lender_id = ${lenderId}::uuid
         AND r.id IS NULL
         AND p.occurred_at >= ${start}
         AND p.occurred_at <= ${end}`,
    );
    return {
      collected: Number(row?.collected ?? 0),
      interest: Math.round(row?.interest ?? 0),
    };
  }

  async originations(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<OriginationTotals> {
    const [row] = await this.prisma.$queryRaw<
      { count: bigint; principal: bigint | null; payable: bigint | null }[]
    >(Prisma.sql`
      SELECT COUNT(*) AS count, SUM(principal_amount) AS principal, SUM(total_payable) AS payable
        FROM loans
       WHERE lender_id = ${lenderId}::uuid
         AND status <> 'CANCELED'
         AND start_date >= ${from}
         AND start_date <= ${to}`);
    return {
      loansCreated: Number(row?.count ?? 0),
      amountLent: Number(row?.principal ?? 0),
      totalPayable: Number(row?.payable ?? 0),
    };
  }

  async visitOutcomes(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<VisitOutcomeCounts> {
    const { start, end } = businessRangeInstants(from, to);
    const rows = await this.prisma.$queryRaw<
      { outcome: keyof VisitOutcomeCounts; count: bigint }[]
    >(
      Prisma.sql`
      SELECT v.outcome::text AS outcome, COUNT(*) AS count
        FROM collection_visits v
        JOIN loans l ON l.id = v.loan_id
       WHERE l.lender_id = ${lenderId}::uuid
         AND v.occurred_at >= ${start}
         AND v.occurred_at <= ${end}
       GROUP BY 1`,
    );
    const counts = { PAID: 0, NOT_FOUND: 0, REFUSED: 0, RESCHEDULED: 0 };
    for (const row of rows) {
      counts[row.outcome] = Number(row.count);
    }
    return counts;
  }

  async settlements(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<readonly SettlementAmounts[]> {
    const rows = await this.prisma.$queryRaw<
      { expected: number; collected: number }[]
    >(Prisma.sql`
      SELECT s.expected_amount AS expected, s.collected_amount AS collected
        FROM daily_settlements s
        JOIN memberships m ON m.id = s.collector_membership_id
       WHERE m.lender_id = ${lenderId}::uuid
         AND s.date >= ${from}
         AND s.date <= ${to}`);
    return rows.map((row) => ({
      expectedAmount: row.expected,
      collectedAmount: row.collected,
    }));
  }
}
