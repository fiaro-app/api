import { LoanRequest } from '@/modules/loan-requests/domain/entities/loan-request.entity.js';

/** Instante fijo de las pruebas. */
export const NOW = new Date('2026-10-15T12:00:00Z');

/** Las condiciones de préstamo que usan las pruebas. */
export const TERMS = {
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY' as const,
  startDate: '2026-10-16',
};

/** El cliente nuevo que usan las pruebas. */
export const NEW_CLIENT = {
  fullName: 'Carlos Gómez',
  occupation: 'Vendedor',
  phone: '+573001234567',
  address: 'Calle 1 # 2-3',
};

/**
 * @param overrides - Lo que cambia respecto de una solicitud `PENDING` de cliente nuevo.
 */
export function buildRequest(
  overrides: Partial<Parameters<typeof LoanRequest.create>[0]> = {},
): LoanRequest {
  return LoanRequest.create({
    id: 'request-1',
    lenderId: 'lender-1',
    requestedByMembershipId: 'collector-membership',
    clientId: null,
    nationalId: '1020304050',
    newClient: NEW_CLIENT,
    terms: TERMS,
    status: 'PENDING',
    resolvedByMembershipId: null,
    resolvedAt: null,
    rejectionReason: null,
    loanId: null,
    createdAt: NOW,
    ...overrides,
  });
}
