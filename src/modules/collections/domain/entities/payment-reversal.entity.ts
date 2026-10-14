/** Datos con los que se construye un {@link PaymentReversal}. */
export interface PaymentReversalProps {
  /** Identificador de la reversión (UUIDv7). */
  readonly id: string;
  /** El pago anulado. Único: un pago se reversa una sola vez. */
  readonly paymentId: string;
  /** Motivo, obligatorio. */
  readonly reason: string;
  /** La membresía (rol `LENDER`) que la hizo. */
  readonly reversedByMembershipId: string;
  /** Cuándo se registró. */
  readonly createdAt: Date;
}

/**
 * Anula un pago completo por un error de registro (PRODUCT.md §5, D-16). El pago queda intacto
 * (append-only): la reversión es la fila que dice que ya no cuenta para el saldo.
 */
export class PaymentReversal {
  private constructor(
    public readonly id: string,
    public readonly paymentId: string,
    public readonly reason: string,
    public readonly reversedByMembershipId: string,
    public readonly createdAt: Date,
  ) {}

  /** @param props - Datos de la reversión. */
  static create(props: PaymentReversalProps): PaymentReversal {
    return new PaymentReversal(
      props.id,
      props.paymentId,
      props.reason,
      props.reversedByMembershipId,
      props.createdAt,
    );
  }
}
