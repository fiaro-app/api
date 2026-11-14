import type { PurchasablePlanCode } from '@/modules/subscriptions/domain/plans/plan-catalog.js';

/** Los estados de un pago, con los mismos nombres que usa Wompi para sus transacciones. */
export const SUBSCRIPTION_PAYMENT_STATUSES = [
  'PENDING',
  'APPROVED',
  'DECLINED',
  'VOIDED',
  'ERROR',
] as const;

/** Estado de un {@link SubscriptionPayment}. */
export type SubscriptionPaymentStatus =
  (typeof SUBSCRIPTION_PAYMENT_STATUSES)[number];

/** Datos con los que se construye un {@link SubscriptionPayment}. */
export interface SubscriptionPaymentProps {
  readonly id: string;
  /** El negocio que paga. */
  readonly tenantId: string;
  readonly planCode: PurchasablePlanCode;
  /** Meses que compra (hoy siempre 1). */
  readonly months: number;
  /** Lo que se cobra, en centavos de peso: Wompi trabaja así. */
  readonly amountInCents: number;
  readonly currency: string;
  /** Identifica la orden ante Wompi; única. */
  readonly reference: string;
  readonly status: SubscriptionPaymentStatus;
  /** La transacción de Wompi que resolvió la orden; `null` mientras está pendiente. */
  readonly wompiTransactionId: string | null;
  readonly paymentMethodType: string | null;
  /** Dónde terminó el período pagado al aprobarse; `null` si no se aprobó. */
  readonly periodEndsAt: Date | null;
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
}

/**
 * Una orden de pago de la suscripción (D-149): nace `PENDING` y la resuelve el aviso de Wompi.
 */
export class SubscriptionPayment {
  private constructor(public readonly props: SubscriptionPaymentProps) {}

  /** @param props - Datos de la orden. */
  static create(props: SubscriptionPaymentProps): SubscriptionPayment {
    return new SubscriptionPayment(props);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get reference(): string {
    return this.props.reference;
  }
}
