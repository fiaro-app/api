import { Injectable } from '@nestjs/common';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import {
  toCollectionVisitRecord,
  WITH_PAYMENT_AND_REVERSAL,
} from '@/modules/collections/infrastructure/persistence/collection-visit.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Lee por lotes lo que las listas con saldo necesitan, de PostgreSQL con Prisma. */
@Injectable()
export class PrismaLoanPortfolioReadRepository implements LoanPortfolioReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param loanIds - Los préstamos. */
  async listVisitRecordsByLoans(
    loanIds: readonly string[],
  ): Promise<readonly CollectionVisitRecord[]> {
    if (loanIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.collectionVisit.findMany({
      where: { loanId: { in: [...loanIds] } },
      include: WITH_PAYMENT_AND_REVERSAL,
      orderBy: { occurredAt: 'asc' },
    });
    return rows.map(toCollectionVisitRecord);
  }

  /**
   * @param loanIds - Los préstamos.
   * @param date - Fecha de calendario (`AAAA-MM-DD`).
   */
  async listCollectorsByLoans(
    loanIds: readonly string[],
    date: string,
  ): Promise<ReadonlyMap<string, string>> {
    if (loanIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.collectionAssignment.findMany({
      where: {
        loanId: { in: [...loanIds] },
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'asc' },
      select: { loanId: true, collectorMembershipId: true },
    });
    return new Map(rows.map((row) => [row.loanId, row.collectorMembershipId]));
  }
}
