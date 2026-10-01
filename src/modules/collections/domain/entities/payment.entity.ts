import type { PaymentMethod } from '@/modules/collections/domain/entities/payment-method.js';

/** Datos con los que se construye un {@link Payment}. */
export interface PaymentProps {
  /** Identificador del pago (UUIDv7). */
  readonly id: string;
  /** El préstamo pagado. */
  readonly loanId: string;
  /** La visita que lo generó. Única: una visita nunca produce más de un pago. */
  readonly visitId: string;
  /** Monto recibido, en pesos colombianos. */
  readonly amount: number;
  readonly method: PaymentMethod;
  /** Igual al `occurredAt` de la visita que lo generó. */
  readonly occurredAt: Date;
  /** Cuándo se registró. */
  readonly createdAt: Date;
}

/**
 * Dinero recibido en una visita (PRODUCT.md §5). Append-only: nunca se edita ni se borra; un
 * error se corrige con un `PaymentReversal` (todavía no existe).
 */
export class Payment {
  private constructor(
    public readonly id: string,
    public readonly loanId: string,
    public readonly visitId: string,
    public readonly amount: number,
    public readonly method: PaymentMethod,
    public readonly occurredAt: Date,
    public readonly createdAt: Date,
  ) {}

  /** @param props - Datos del pago. */
  static create(props: PaymentProps): Payment {
    return new Payment(
      props.id,
      props.loanId,
      props.visitId,
      props.amount,
      props.method,
      props.occurredAt,
      props.createdAt,
    );
  }
}
