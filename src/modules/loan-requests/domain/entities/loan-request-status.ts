/** Estados de una solicitud de préstamo hecha por un cobrador. */
export const LOAN_REQUEST_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;

/** Estado de una solicitud: `PENDING` espera al administrador; las otras dos son finales. */
export type LoanRequestStatus = (typeof LOAN_REQUEST_STATUSES)[number];
