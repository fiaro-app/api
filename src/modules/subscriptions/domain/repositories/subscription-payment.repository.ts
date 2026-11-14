import type {
  RefundMode,
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

/** Los datos con que se registra el reembolso de un pago aprobado (D-156). */
export interface PaymentRefundInput {
  readonly reference: string;
  readonly refundedAt: Date;
  readonly refundedByUserId: string;
  readonly mode: RefundMode;
  readonly refundReference: string | null;
  readonly reason: string;
}

/** Un pago con el nombre del negocio que lo hizo, para quien opera la plataforma. */
export interface PaymentWithTenant {
  readonly payment: SubscriptionPayment;
  readonly tenantName: string;
}

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
   * Las órdenes de un negocio, de la más reciente a la más vieja.
   *
   * @param tenantId - El negocio.
   * @param limit - Cuántas como máximo.
   */
  listByTenant(
    tenantId: string,
    limit: number,
  ): Promise<readonly SubscriptionPayment[]>;

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
    status: Exclude<
      SubscriptionPaymentStatus,
      'PENDING' | 'APPROVED' | 'REFUNDED'
    >,
  ): Promise<ResolveOutcome>;

  /**
   * Marca el pago como reembolsado y le quita a la suscripción del negocio los meses que ese pago
   * había sumado, en una sola transacción. Solo lo hace si el pago seguía `APPROVED`: un reembolso
   * repetido no resta dos veces.
   *
   * @param input - Quién, cuándo, cómo y por qué.
   * @returns `APPLIED`, o `ALREADY_RESOLVED` si el pago no estaba aprobado.
   */
  refund(input: PaymentRefundInput): Promise<ResolveOutcome>;

  /**
   * Los pagos de todos los negocios, del más reciente al más viejo, con el nombre del negocio.
   *
   * @param limit - Cuántos como máximo.
   * @param status - Solo los que están en este estado; ausente para todos.
   */
  listAll(
    limit: number,
    status?: SubscriptionPaymentStatus,
  ): Promise<readonly PaymentWithTenant[]>;
}
