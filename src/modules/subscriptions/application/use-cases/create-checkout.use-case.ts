import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type {
  CheckoutParams,
  PaymentGateway,
} from '@/modules/subscriptions/application/ports/payment-gateway.port.js';
import { PAYMENT_GATEWAY } from '@/modules/subscriptions/application/ports/payment-gateway.token.js';
import { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { BillingUnavailableError } from '@/modules/subscriptions/domain/errors/billing-unavailable.error.js';
import {
  PLAN_PRICE_COP,
  type PurchasablePlanCode,
} from '@/modules/subscriptions/domain/plans/plan-catalog.js';
import type { SubscriptionPaymentRepository } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-payment-repository.token.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/** La orden recién creada y lo que hace falta para pagarla en Wompi. */
export interface CreatedCheckout {
  readonly reference: string;
  readonly planCode: PurchasablePlanCode;
  readonly months: number;
  readonly checkout: CheckoutParams;
}

const CURRENCY = 'COP';
/** Meses por pago: solo mensual en la primera versión (D-149). */
const MONTHS = 1;

/**
 * Crea la orden de pago de un mes de un plan y arma lo que la web necesita para llevar a la dueña
 * a pagar en Wompi. El monto sale del precio del plan en el servidor, nunca del cliente. Quién
 * puede pedirlo (`OWNER`) lo decide el controller.
 */
@Injectable()
export class CreateCheckoutUseCase {
  constructor(
    @Inject(SUBSCRIPTION_PAYMENT_REPOSITORY)
    private readonly payments: SubscriptionPaymentRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly getLender: GetLenderUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(AUDIT_LOG) private readonly audit: AuditLog,
  ) {}

  /**
   * @param lenderId - El prestamista con el que opera la sesión.
   * @param planCode - El plan que quiere pagar.
   * @throws {@link BillingUnavailableError} Si Wompi no está configurado en este entorno.
   */
  async execute(
    lenderId: string,
    planCode: PurchasablePlanCode,
  ): Promise<CreatedCheckout> {
    if (!this.gateway.isConfigured()) {
      throw new BillingUnavailableError();
    }
    const lender = await this.getLender.execute(lenderId);
    const id = this.ids.next();
    const payment = SubscriptionPayment.create({
      id,
      tenantId: lender.tenantId,
      planCode,
      months: MONTHS,
      amountInCents: PLAN_PRICE_COP[planCode] * MONTHS * 100,
      currency: CURRENCY,
      reference: `fiaro-${id}`,
      status: 'PENDING',
      wompiTransactionId: null,
      paymentMethodType: null,
      periodEndsAt: null,
      createdAt: this.clock.now(),
      resolvedAt: null,
    });
    await this.payments.create(payment);
    this.audit.record({
      action: 'billing.checkout.created',
      outcome: 'SUCCESS',
      occurredAt: payment.props.createdAt,
      details: {
        tenantId: payment.tenantId,
        reference: payment.reference,
        planCode,
        amountInCents: payment.props.amountInCents,
      },
    });
    return {
      reference: payment.reference,
      planCode,
      months: MONTHS,
      checkout: this.gateway.checkoutFor({
        reference: payment.reference,
        amountInCents: payment.props.amountInCents,
        currency: CURRENCY,
      }),
    };
  }
}
