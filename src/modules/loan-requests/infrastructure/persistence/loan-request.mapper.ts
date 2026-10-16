import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { LoanRequestModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { LoanRequest } from '@/modules/loan-requests/domain/entities/loan-request.entity.js';

/** @param request - Solicitud nueva. */
export function toLoanRequestCreateInput(
  request: LoanRequest,
): Prisma.LoanRequestUncheckedCreateInput {
  return {
    id: request.id,
    lenderId: request.lenderId,
    requestedByMembershipId: request.requestedByMembershipId,
    clientId: request.clientId,
    nationalId: request.nationalId,
    clientFullName: request.newClient?.fullName ?? null,
    clientOccupation: request.newClient?.occupation ?? null,
    clientPhone: request.newClient?.phone ?? null,
    clientAddress: request.newClient?.address ?? null,
    ...request.terms,
    status: request.status,
    createdAt: request.createdAt,
  };
}

/** @param row - Fila de `loan_requests`. */
export function toLoanRequest(row: LoanRequestModel): LoanRequest {
  return LoanRequest.create({
    id: row.id,
    lenderId: row.lenderId,
    requestedByMembershipId: row.requestedByMembershipId,
    clientId: row.clientId,
    nationalId: row.nationalId,
    newClient:
      row.clientFullName !== null &&
      row.clientOccupation !== null &&
      row.clientPhone !== null &&
      row.clientAddress !== null
        ? {
            fullName: row.clientFullName,
            occupation: row.clientOccupation,
            phone: row.clientPhone,
            address: row.clientAddress,
          }
        : null,
    terms: {
      principalAmount: row.principalAmount,
      installmentCount: row.installmentCount,
      installmentValue: row.installmentValue,
      totalPayable: row.totalPayable,
      frequency: row.frequency,
      startDate: row.startDate,
    },
    status: row.status,
    resolvedByMembershipId: row.resolvedByMembershipId,
    resolvedAt: row.resolvedAt,
    rejectionReason: row.rejectionReason,
    loanId: row.loanId,
    createdAt: row.createdAt,
  });
}
