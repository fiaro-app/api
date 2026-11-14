import type { LoanRequestDetails } from '@/modules/loan-requests/application/dtos/loan-request-details.dto.js';
import type { LoanRequest } from '@/modules/loan-requests/domain/entities/loan-request.entity.js';

/** @param request - La solicitud del dominio. */
export function toLoanRequestDetails(request: LoanRequest): LoanRequestDetails {
  return {
    id: request.id,
    status: request.status,
    requestedByMembershipId: request.requestedByMembershipId,
    clientId: request.clientId,
    nationalId: request.nationalId,
    newClient: request.newClient,
    ...request.terms,
    resolvedAt: request.resolvedAt,
    rejectionReason: request.rejectionReason,
    loanId: request.loanId,
    createdAt: request.createdAt,
  };
}
