import { Injectable } from '@nestjs/common';
import type { LoanRequest } from '@/modules/loan-requests/domain/entities/loan-request.entity.js';
import type {
  ListLoanRequestsCriteria,
  LoanRequestRepository,
  LoanRequestsPage,
  ResolveLoanRequestInput,
} from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import {
  toLoanRequest,
  toLoanRequestCreateInput,
} from '@/modules/loan-requests/infrastructure/persistence/loan-request.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda las solicitudes de préstamo en PostgreSQL con Prisma. */
@Injectable()
export class PrismaLoanRequestRepository implements LoanRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param request - Solicitud nueva. */
  async create(request: LoanRequest): Promise<void> {
    await this.prisma.loanRequest.create({
      data: toLoanRequestCreateInput(request),
    });
  }

  /**
   * @param id - La solicitud.
   * @param lenderId - El prestamista dueño.
   */
  async findById(id: string, lenderId: string): Promise<LoanRequest | null> {
    const row = await this.prisma.loanRequest.findFirst({
      where: { id, lenderId },
    });
    return row === null ? null : toLoanRequest(row);
  }

  /** @param criteria - Filtros y paginación. */
  async list(criteria: ListLoanRequestsCriteria): Promise<LoanRequestsPage> {
    const where = {
      lenderId: criteria.lenderId,
      ...(criteria.status === undefined ? {} : { status: criteria.status }),
      ...(criteria.requestedByMembershipId === undefined
        ? {}
        : { requestedByMembershipId: criteria.requestedByMembershipId }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.loanRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.loanRequest.count({ where }),
    ]);
    return { items: rows.map(toLoanRequest), total };
  }

  /** @param input - Datos de la resolución. */
  async resolve(input: ResolveLoanRequestInput): Promise<boolean> {
    const result = await this.prisma.loanRequest.updateMany({
      where: { id: input.id, lenderId: input.lenderId, status: 'PENDING' },
      data: {
        status: input.to,
        resolvedByMembershipId: input.resolvedByMembershipId,
        resolvedAt: input.resolvedAt,
        rejectionReason: input.rejectionReason,
      },
    });
    return result.count === 1;
  }

  /**
   * @param id - La solicitud.
   * @param loanId - El préstamo creado.
   */
  async attachLoan(id: string, loanId: string): Promise<void> {
    await this.prisma.loanRequest.update({ where: { id }, data: { loanId } });
  }

  /** @param id - La solicitud. */
  async reopen(id: string): Promise<void> {
    await this.prisma.loanRequest.update({
      where: { id },
      data: {
        status: 'PENDING',
        resolvedByMembershipId: null,
        resolvedAt: null,
        rejectionReason: null,
      },
    });
  }
}
