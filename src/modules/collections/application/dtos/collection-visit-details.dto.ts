import type { PaymentMethod } from '@/modules/collections/domain/entities/payment-method.js';
import type { VisitOutcome } from '@/modules/collections/domain/entities/visit-outcome.js';

/** Los datos públicos de un pago, tal como los describe `PaymentSchema`. */
export interface PaymentDetails {
  /** Identificador del pago (UUIDv7). */
  readonly id: string;
  /** El préstamo pagado. */
  readonly loanId: string;
  /** La visita que lo generó. */
  readonly visitId: string;
  /** Monto recibido, en pesos colombianos. */
  readonly amount: number;
  readonly method: PaymentMethod;
  /** Igual al `occurredAt` de la visita que lo generó. */
  readonly occurredAt: Date;
  /** Cuándo se registró. */
  readonly createdAt: Date;
}

/** Los datos públicos de una visita, tal como los describe `CollectionVisitSchema`. */
export interface CollectionVisitDetails {
  /** Identificador de la visita (UUIDv7), el que generó el dispositivo. */
  readonly id: string;
  /** El préstamo visitado. */
  readonly loanId: string;
  /** La membresía (rol `COLLECTOR`) que hizo la visita. */
  readonly collectorMembershipId: string;
  readonly outcome: VisitOutcome;
  /** Cuota que se esperaba cobrar en ese momento. */
  readonly expectedAmount: number;
  /** Solo con `RESCHEDULED`. */
  readonly promisedDate: string | null;
  /** Hora real de la visita según el dispositivo. */
  readonly occurredAt: Date;
  /** Hora en que la visita llegó al servidor. */
  readonly createdAt: Date;
  /** El pago que generó, o `null` si `outcome` no fue `PAID`. */
  readonly payment: PaymentDetails | null;
}

/** El pago que trae el pedido, solo cuando `outcome` es `PAID`. */
export interface CollectionVisitPaymentInput {
  /** Monto recibido, en pesos colombianos. */
  readonly amount: number;
  /** Ausente: `CASH` por defecto (PRODUCT.md §5). */
  readonly method?: PaymentMethod;
}

/** Datos con los que se registra una visita de cobro. */
export interface CreateCollectionVisitInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** El préstamo visitado. */
  readonly loanId: string;
  /** La membresía (rol `COLLECTOR`) de la sesión. */
  readonly collectorMembershipId: string;
  /** Identificador de la visita, generado por el dispositivo: también es su llave de idempotencia. */
  readonly id: string;
  readonly outcome: VisitOutcome;
  /** Obligatoria si, y solo si, `outcome` es `RESCHEDULED`. */
  readonly promisedDate?: string | null;
  /** Hora real de la visita según el dispositivo. */
  readonly occurredAt: Date;
  /** Obligatorio si, y solo si, `outcome` es `PAID`. */
  readonly payment?: CollectionVisitPaymentInput | null;
}
