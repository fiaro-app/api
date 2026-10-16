import type {
  SubscriptionPayment,
  SubscriptionPaymentStatus,
} from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';

/** Datos del aviso de Wompi con que se resuelve una orden. */
export interface PaymentResolution {
  /** La orden, por su referencia. */
  readonly reference: string;
  readonly wompiTransactionId: string;
  readonly paymentMethodType: string | null;
  /** Cuándo se resuelve. */
  readonly resolvedAt: Date;
}

/** Qué pasó al intentar resolver una orden. */
export type ResolveOutcome =
  /** Esta llamada la resolvió. */
  | 'APPLIED'
  /** Ya estaba resuelta (un aviso repetido): no se tocó nada. */
  | 'ALREADY_RESOLVED';

/** Puerto de persistencia de las órdenes de pago de la suscripción. */
export interface SubscriptionPaymentRepository {
  /** @param payment - Orden nueva. */
  create(payment: SubscriptionPayment): Promise<void>;

  /**
   * @param reference - La referencia de la orden.
   * @returns La orden, o `null` si no existe.
   */
  findByReference(reference: string): Promise<SubscriptionPayment | null>;

  /**
   * Marca la orden como aprobada y aplica el pago a la suscripción del negocio (plan nuevo y
   * período extendido) en una sola transacción. Solo lo hace una vez: si ya estaba resuelta, no
   * toca nada.
   *
   * @param resolution - Lo que dice el aviso de Wompi.
   */
  approve(resolution: PaymentResolution): Promise<ResolveOutcome>;

  /**
   * Cierra la orden como no aprobada. No toca la suscripción.
   *
   * @param resolution - Lo que dice el aviso de Wompi.
   * @param status - `DECLINED`, `VOIDED` o `ERROR`.
   */
  reject(
    resolution: PaymentResolution,
    status: Exclude<SubscriptionPaymentStatus, 'PENDING' | 'APPROVED'>,
  ): Promise<ResolveOutcome>;
}
