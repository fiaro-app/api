import { z } from 'zod';
import { SUBSCRIPTION_PAYMENT_STATUSES } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { PURCHASABLE_PLAN_CODES } from '@/modules/subscriptions/domain/plans/plan-catalog.js';
import type { CreatedCheckout } from '@/modules/subscriptions/application/use-cases/create-checkout.use-case.js';
import type { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';

/** Cuerpo de `POST /subscription/checkout`: solo el plan; el monto lo pone el servidor. */
export const CreateCheckoutRequestSchema = z.strictObject({
  planCode: z.enum(PURCHASABLE_PLAN_CODES).meta({
    description: 'El plan que se quiere pagar (un mes).',
    example: 'PRO',
  }),
});

/** Respuesta de `POST /subscription/checkout`: lo que la web manda a Wompi. */
export const CheckoutResponseSchema = z
  .object({
    reference: z.string().meta({
      description: 'La referencia de la orden; con ella se consulta su estado.',
    }),
    planCode: z.enum(PURCHASABLE_PLAN_CODES),
    months: z.int(),
    checkout: z
      .object({
        url: z.url().meta({ description: 'La página de pago de Wompi.' }),
        publicKey: z.string().meta({ description: '`public-key` de Wompi.' }),
        currency: z.string().meta({ example: 'COP' }),
        amountInCents: z.int().meta({
          description: '`amount-in-cents`: el precio del plan en centavos.',
        }),
        reference: z.string(),
        signatureIntegrity: z.string().meta({
          description:
            '`signature:integrity`: firma del monto, hecha en el servidor.',
        }),
        redirectUrl: z.url().meta({
          description: 'A dónde vuelve la persona después de pagar.',
        }),
      })
      .meta({
        description:
          'Campos del formulario `GET` hacia `url` (`public-key`, `currency`, `amount-in-cents`, `reference`, `signature:integrity`, `redirect-url`).',
      }),
  })
  .meta({ id: 'CheckoutResponse' });

/** Respuesta de `GET /subscription/checkout/:reference`. */
export const CheckoutStatusResponseSchema = z
  .object({
    reference: z.string(),
    planCode: z.enum(PURCHASABLE_PLAN_CODES),
    status: z.enum(SUBSCRIPTION_PAYMENT_STATUSES).meta({
      description:
        '`PENDING` mientras Wompi no avisa; `APPROVED` cuando el pago ya se aplicó al plan; `DECLINED`, `VOIDED` o `ERROR` si no se aprobó.',
    }),
    amountInCents: z.int(),
    currency: z.string(),
    createdAt: z.iso.datetime({ offset: true }),
    resolvedAt: z.iso.datetime({ offset: true }).nullable(),
    periodEndsAt: z.iso.datetime({ offset: true }).nullable().meta({
      description: 'Hasta cuándo quedó pagado el plan; `null` si no se aprobó.',
    }),
  })
  .meta({ id: 'CheckoutStatusResponse' });

/** @param created - La orden recién creada. */
export function toCheckoutResponse(
  created: CreatedCheckout,
): z.output<typeof CheckoutResponseSchema> {
  return { ...created };
}

/** @param payment - La orden. */
export function toCheckoutStatusResponse(
  payment: SubscriptionPayment,
): z.output<typeof CheckoutStatusResponseSchema> {
  const { props } = payment;
  return {
    reference: props.reference,
    planCode: props.planCode,
    status: props.status,
    amountInCents: props.amountInCents,
    currency: props.currency,
    createdAt: props.createdAt.toISOString(),
    resolvedAt: props.resolvedAt?.toISOString() ?? null,
    periodEndsAt: props.periodEndsAt?.toISOString() ?? null,
  };
}

/** Respuesta de `GET /subscription/payments`: el historial de órdenes, de la más reciente a la más vieja. */
export const PaymentHistoryResponseSchema = z
  .object({
    items: z.array(
      CheckoutStatusResponseSchema.extend({
        months: z
          .int()
          .meta({ description: 'Meses que compró la orden (hoy siempre 1).' }),
        paymentMethodType: z.string().nullable().meta({
          description:
            'Medio con el que pagó según Wompi (`PSE`, `CARD`, `NEQUI`…); `null` mientras está pendiente.',
        }),
      }),
    ),
  })
  .meta({ id: 'PaymentHistoryResponse' });

/** @param payments - Las órdenes, de la más reciente a la más vieja. */
export function toPaymentHistoryResponse(
  payments: readonly SubscriptionPayment[],
): z.output<typeof PaymentHistoryResponseSchema> {
  return {
    items: payments.map((payment) => ({
      ...toCheckoutStatusResponse(payment),
      months: payment.props.months,
      paymentMethodType: payment.props.paymentMethodType,
    })),
  };
}
