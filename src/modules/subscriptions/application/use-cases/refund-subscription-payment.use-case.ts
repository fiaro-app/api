import { Inject, Injectable } from '@nestjs/common';
import type { PaymentGateway } from '@/modules/subscriptions/application/ports/payment-gateway.port.js';
import { PAYMENT_GATEWAY } from '@/modules/subscriptions/application/ports/payment-gateway.token.js';
import type {
  RefundMode,
  SubscriptionPayment,
} from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { PaymentNotRefundableError } from '@/modules/subscriptions/domain/errors/payment-not-refundable.error.js';
import { RefundGatewayFailedError } from '@/modules/subscriptions/domain/errors/refund-gateway-failed.error.js';
import { RefundMethodUnsupportedError } from '@/modules/subscriptions/domain/errors/refund-method-unsupported.error.js';
import { SubscriptionPaymentNotFoundError } from '@/modules/subscriptions/domain/errors/subscription-payment-not-found.error.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-payment-repository.token.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/** Lo que pide quien opera la plataforma para devolver un pago (D-156). */
export interface RefundSubscriptionPaymentInput {
  /** La referencia de la orden. */
  readonly reference: string;
  /** `WOMPI_VOID` pide a Wompi anular la transacción; `MANUAL` solo lo registra (se devolvió por otro lado). */
  readonly mode: RefundMode;
  /** La referencia de la devolución en Wompi o en el banco, si la hay. */
  readonly refundReference: string | null;
  readonly reason: string;
  /** Quien lo registra. */
  readonly actorUserId: string;
}

/**
 * Devuelve por completo un pago aprobado del plan (D-156): con `WOMPI_VOID` anula antes la transacción en
 * Wompi (solo tarjeta); con `MANUAL` solo registra una devolución hecha a mano. En ambos casos el pago
 * pasa a `REFUNDED` y la suscripción pierde los meses que ese pago había sumado, en una transacción, y
 * queda auditado.
 *
 * @remarks
 * Wompi primero y la base después: la anulación es lo que no se puede deshacer. Si la base falla después
 * de que Wompi aceptó, el pago sigue `APPROVED` y se repite la devolución en modo `MANUAL`.
 */
@Injectable()
export class RefundSubscriptionPaymentUseCase {
  constructor(
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly payments: SubscriptionPaymentRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(AUDIT_LOG) private readonly audit: AuditLog,
  ) {}

  /**
   * @param input - La orden, cómo se devuelve y por qué.
   * @returns El pago ya reembolsado.
   * @throws {@link SubscriptionPaymentNotFoundError} Si la referencia no es de ninguna orden.
   * @throws {@link PaymentNotRefundableError} Si el pago no está aprobado (o ya se devolvió).
   * @throws {@link RefundMethodUnsupportedError} Si pide anular en Wompi algo que no se puede anular.
   * @throws {@link RefundGatewayFailedError} Si Wompi no aceptó la anulación.
   */
  async execute(
    input: RefundSubscriptionPaymentInput,
  ): Promise<SubscriptionPayment> {
    const payment = await this.payments.findByReference(input.reference);
    if (payment === null) {
      throw new SubscriptionPaymentNotFoundError(input.reference);
    }
    if (payment.props.status !== 'APPROVED') {
      throw new PaymentNotRefundableError();
    }
    const transactionId = payment.props.wompiTransactionId;
    if (input.mode === 'WOMPI_VOID') {
      if (
        payment.props.paymentMethodType !== 'CARD' ||
        transactionId === null ||
        !this.gateway.canVoid()
      ) {
        throw new RefundMethodUnsupportedError();
      }
      if ((await this.gateway.voidTransaction(transactionId)) === 'REJECTED') {
        throw new RefundGatewayFailedError();
      }
    }
    const refundedAt = this.clock.now();
    const outcome = await this.payments.refund({
      reference: input.reference,
      refundedAt,
      refundedByUserId: input.actorUserId,
      mode: input.mode,
      refundReference: input.refundReference,
      reason: input.reason,
    });
    if (outcome === 'ALREADY_RESOLVED') {
      throw new PaymentNotRefundableError();
    }
    this.audit.record({
      action: 'billing.payment.refunded',
      outcome: 'SUCCESS',
      occurredAt: refundedAt,
      details: {
        tenantId: payment.tenantId,
        reference: input.reference,
        mode: input.mode,
        actorUserId: input.actorUserId,
      },
    });
    const saved = await this.payments.findByReference(input.reference);
    return saved ?? payment;
  }
}
