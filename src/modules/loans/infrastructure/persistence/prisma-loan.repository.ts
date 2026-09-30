import { Injectable } from '@nestjs/common';
import type { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type {
  ListLoansCriteria,
  LoanRepository,
  LoansPage,
} from '@/modules/loans/domain/repositories/loan.repository.js';
import {
  toLoan,
  toLoanCreateInput,
} from '@/modules/loans/infrastructure/persistence/loan.mapper.js';
import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a los préstamos en PostgreSQL con Prisma. */
@Injectable()
export class PrismaLoanRepository implements LoanRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param loan - Préstamo nuevo. */
  async create(loan: Loan): Promise<void> {
    await this.prisma.loan.create({ data: toLoanCreateInput(loan) });
  }

  /**
   * @param id - Identificador del préstamo.
   * @param lenderId - El prestamista dueño.
   */
  async findById(id: string, lenderId: string): Promise<Loan | null> {
    const row = await this.prisma.loan.findFirst({
      where: { id, lenderId },
    });
    return row === null ? null : toLoan(row);
  }

  /** @param criteria - Prestamista, paginación y filtros opcionales. */
  async list(criteria: ListLoansCriteria): Promise<LoansPage> {
    const where: Prisma.LoanWhereInput = {
      lenderId: criteria.lenderId,
      ...(criteria.clientId ? { clientId: criteria.clientId } : {}),
      ...(criteria.status ? { status: criteria.status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.loan.count({ where }),
    ]);
    return { items: rows.map(toLoan), total };
  }
}
