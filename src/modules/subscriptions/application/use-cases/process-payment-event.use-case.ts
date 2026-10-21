import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  PaymentEvent,
  PaymentGateway,
} from '@/modules/subscriptions/application/ports/payment-gateway.port.js';
import { PAYMENT_GATEWAY } from '@/modules/subscriptions/application/ports/payment-gateway.token.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type { TenantOwners } from '@/modules/subscriptions/application/ports/tenant-owners.port.js';
import { TENANT_OWNERS } from '@/modules/subscriptions/application/ports/tenant-owners.token.js';
import {
  PAYMENT_RECEIVED_TITLE,
  paymentReceivedBody,
} from '@/modules/subscriptions/domain/notifications/payment-received.js';
import type { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-payment-repository.token.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Qué hizo la API con un aviso de Wompi. Todo menos `INVALID` se responde 200 para que Wompi no
 * reintente.
 */
export type PaymentEventOutcome =
  /** La firma no coincide o el aviso no tiene la forma esperada. */
  | 'INVALID'
  /** Aviso auténtico de otro tipo. */
  | 'IGNORED'
  /** El pago se aprobó y se aplicó a la suscripción. */
  | 'APPROVED'
  /** Wompi cerró la orden sin aprobarla. */
  | 'NOT_APPROVED'
  /** La orden ya estaba resuelta (un aviso repetido). */
  | 'DUPLICATE'
  /** La referencia no es de ninguna orden, o el monto no coincide con la orden. */
  | 'REJECTED';

const NOT_APPROVED_STATUSES = ['DECLINED', 'VOIDED', 'ERROR'] as const;
type NotApprovedStatus = (typeof NOT_APPROVED_STATUSES)[number];

/** @param status - El estado que reporta Wompi. */
function isNotApproved(status: string): status is NotApprovedStatus {
  return (NOT_APPROVED_STATUSES as readonly string[]).includes(status);
}

/**
 * Procesa un aviso `transaction.updated` de Wompi (D-149): comprueba su firma, la orden y el
 * monto, y aprueba o cierra la orden una sola vez, aunque Wompi mande el aviso varias veces.
 */
@Injectable()
export class ProcessPaymentEventUseCase {
  private readonly logger = new Logger(ProcessPaymentEventUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly payments: SubscriptionPaymentRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(AUDIT_LOG) private readonly audit: AuditLog,
    @Inject(TENANT_OWNERS) private readonly tenantOwners: TenantOwners,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  /**
   * @param body - El cuerpo del aviso, sin confiar en él.
   * @param checksumHeader - La cabecera `X-Event-Checksum`, si vino.
   */
  async execute(
    body: unknown,
    checksumHeader: string | undefined,
  ): Promise<PaymentEventOutcome> {
    const parsed = this.gateway.parseEvent(body, checksumHeader);
    if (parsed.kind === 'invalid') {
      this.rejected('INVALID_SIGNATURE', {});
      return 'INVALID';
    }
    if (parsed.kind === 'ignored') {
      return 'IGNORED';
    }
    const { event } = parsed;
    const payment = await this.payments.findByReference(event.reference);
    if (payment === null) {
      this.rejected('UNKNOWN_REFERENCE', { reference: event.reference });
      return 'REJECTED';
    }
    if (
      payment.props.amountInCents !== event.amountInCents ||
      payment.props.currency !== event.currency
    ) {
      this.rejected('AMOUNT_MISMATCH', { reference: event.reference });
      return 'REJECTED';
    }
    return await this.resolve(payment, event);
  }

  private async resolve(
    payment: SubscriptionPayment,
    event: PaymentEvent,
  ): Promise<PaymentEventOutcome> {
    const resolution = {
      reference: event.reference,
      wompiTransactionId: event.wompiTransactionId,
      paymentMethodType: event.paymentMethodType,
      resolvedAt: this.clock.now(),
    };
    const details = {
      tenantId: payment.tenantId,
      reference: event.reference,
      wompiTransactionId: event.wompiTransactionId,
      status: event.status,
    };
    if (event.status === 'APPROVED') {
      if ((await this.payments.approve(resolution)) === 'ALREADY_RESOLVED') {
        return 'DUPLICATE';
      }
      this.audit.record({
        action: 'billing.payment.approved',
        outcome: 'SUCCESS',
        occurredAt: resolution.resolvedAt,
        details: { ...details, planCode: payment.props.planCode },
      });
      await this.confirmToOwners(payment);
      return 'APPROVED';
    }
    if (isNotApproved(event.status)) {
      if (
        (await this.payments.reject(resolution, event.status)) ===
        'ALREADY_RESOLVED'
      ) {
        return 'DUPLICATE';
      }
      this.audit.record({
        action: 'billing.payment.not_approved',
        outcome: 'FAILURE',
        reason: event.status,
        occurredAt: resolution.resolvedAt,
        details,
      });
      return 'NOT_APPROVED';
    }
    return 'IGNORED';
  }

  /**
   * Le confirma el pago a la dueña (en la app, por correo y por push, según sus canales). El pago ya
   * quedó aplicado: si el aviso falla se escribe en el log y no se propaga, porque un error aquí haría
   * que Wompi reintente y el aviso nunca saldría (el reintento ya vería la orden resuelta).
   *
   * @param payment - La orden recién aprobada.
   */
  private async confirmToOwners(payment: SubscriptionPayment): Promise<void> {
    try {
      const [owners, saved] = await Promise.all([
        this.tenantOwners.ownersOf(payment.tenantId),
        this.payments.findByReference(payment.reference),
      ]);
      const periodEndsAt = saved?.props.periodEndsAt;
      if (!periodEndsAt) {
        return;
      }
      const body = paymentReceivedBody(
        payment.props.planCode,
        payment.props.amountInCents,
        periodEndsAt,
      );
      await Promise.all(
        owners.map((owner) =>
          this.createNotification.execute({
            recipientUserId: owner.userId,
            lenderId: owner.lenderId,
            severity: 'SUCCESS',
            title: PAYMENT_RECEIVED_TITLE,
            body,
            relatedEntityType: 'SUBSCRIPTION',
            relatedEntityId: payment.props.id,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `No se pudo confirmar el pago ${payment.reference} a la dueña: ${String(error)}.`,
      );
    }
  }

  private rejected(
    reason: string,
    details: Readonly<Record<string, string>>,
  ): void {
    this.audit.record({
      action: 'billing.webhook.rejected',
      outcome: 'FAILURE',
      reason,
      occurredAt: this.clock.now(),
      details,
    });
  }
}
