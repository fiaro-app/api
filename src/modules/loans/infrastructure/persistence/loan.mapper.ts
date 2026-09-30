import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { LoanModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';

/** @param loan - Préstamo nuevo. */
export function toLoanCreateInput(loan: Loan): Prisma.LoanUncheckedCreateInput {
  return {
    id: loan.id,
    lenderId: loan.lenderId,
    clientId: loan.clientId,
    principalAmount: loan.principalAmount,
    installmentCount: loan.installmentCount,
    installmentValue: loan.installmentValue,
    totalPayable: loan.totalPayable,
    frequency: loan.frequency,
    startDate: loan.startDate,
    status: loan.status,
    createdByMembershipId: loan.createdByMembershipId,
    createdAt: loan.createdAt,
    closedAt: loan.closedAt,
  };
}

/** @param row - Fila de `loans`. */
export function toLoan(row: LoanModel): Loan {
  return Loan.create({
    id: row.id,
    lenderId: row.lenderId,
    clientId: row.clientId,
    principalAmount: row.principalAmount,
    installmentCount: row.installmentCount,
    installmentValue: row.installmentValue,
    totalPayable: row.totalPayable,
    frequency: row.frequency,
    startDate: row.startDate,
    status: row.status,
    createdByMembershipId: row.createdByMembershipId,
    createdAt: row.createdAt,
    closedAt: row.closedAt,
  });
}
