import { Injectable } from '@nestjs/common';
import type { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type { LoanStatus } from '@/modules/loans/domain/entities/loan-status.js';
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
      ...(criteria.ids ? { id: { in: [...criteria.ids] } } : {}),
      ...(criteria.openAt
        ? {
            createdAt: { lt: criteria.openAt },
            OR: [{ closedAt: null }, { closedAt: { gte: criteria.openAt } }],
          }
        : {}),
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

  /**
   * @param lenderId - El prestamista dueño.
   * @param clientIds - Los clientes.
   */
  async listActiveByClients(
    lenderId: string,
    clientIds: readonly string[],
  ): Promise<readonly Loan[]> {
    const rows = await this.prisma.loan.findMany({
      where: { lenderId, clientId: { in: [...clientIds] }, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toLoan);
  }

  /** @param status - El estado de los préstamos. */
  async countActive(lenderId: string): Promise<number> {
    return await this.prisma.loan.count({
      where: { lenderId, status: 'ACTIVE' },
    });
  }

  async listLenderIdsWithStatus(
    status: LoanStatus,
  ): Promise<readonly string[]> {
    const rows = await this.prisma.loan.findMany({
      where: { status },
      distinct: ['lenderId'],
      select: { lenderId: true },
    });
    return rows.map((row) => row.lenderId);
  }

  /** @param loan - Préstamo con sus datos ya actualizados. */
  async update(loan: Loan): Promise<void> {
    await this.prisma.loan.update({
      where: { id: loan.id, lenderId: loan.lenderId },
      data: toLoanCreateInput(loan),
    });
  }
}
