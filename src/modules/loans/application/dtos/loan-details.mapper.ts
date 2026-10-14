import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { Loan } from '@/modules/loans/domain/entities/loan.entity.js';

/** @param loan - El préstamo. */
export function toLoanDetails(loan: Loan): LoanDetails {
  return {
    id: loan.id,
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
