/** Los datos públicos de una reversión de pago, tal como los describe `PaymentReversalSchema`. */
export interface PaymentReversalDetails {
  /** Identificador de la reversión (UUIDv7). */
  readonly id: string;
  /** El pago anulado. */
  readonly paymentId: string;
  /** Motivo. */
  readonly reason: string;
  /** La membresía (rol `LENDER`) que la hizo. */
  readonly reversedByMembershipId: string;
  /** Cuándo se registró. */
  readonly createdAt: Date;
}

/** Datos con los que se reversa un pago. */
export interface CreatePaymentReversalInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** El pago a reversar. */
  readonly paymentId: string;
  /** Motivo, obligatorio. */
  readonly reason: string;
  /** La membresía (rol `LENDER`) de la sesión. */
  readonly reversedByMembershipId: string;
}
