import { z } from 'zod';
import {
  REFUND_MODES,
  SUBSCRIPTION_PAYMENT_STATUSES,
  type SubscriptionPayment,
} from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { PURCHASABLE_PLAN_CODES } from '@/modules/subscriptions/domain/plans/plan-catalog.js';
import type { PaymentWithTenant } from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';

/** Cuerpo de `POST /admin/subscription-payments/:reference/refund`. */
export const RefundPaymentRequestSchema = z.strictObject({
  mode: z.enum(REFUND_MODES).meta({
    description:
      '`WOMPI_VOID` pide a Wompi anular la transacción (solo pagos con tarjeta). `MANUAL` solo registra una devolución hecha por otro lado.',
    example: 'MANUAL',
  }),
  reference: z.string().trim().min(1).max(120).optional().meta({
    description: 'La referencia de la devolución en Wompi o en el banco.',
  }),
  reason: z.string().trim().min(1).max(500).meta({
    description: 'Por qué se devuelve; queda registrado.',
  }),
});

/** Consulta de `GET /admin/subscription-payments`. */
export const ListAdminPaymentsQuerySchema = z.strictObject({
  status: z.enum(SUBSCRIPTION_PAYMENT_STATUSES).optional().meta({
    description: 'Solo los pagos en este estado; ausente para todos.',
  }),
});

const AdminPaymentSchema = z
  .object({
    reference: z.string(),
    tenantName: z.string().meta({ description: 'El negocio que pagó.' }),
    planCode: z.enum(PURCHASABLE_PLAN_CODES),
    months: z.int(),
    amountInCents: z.int(),
    currency: z.string(),
    status: z.enum(SUBSCRIPTION_PAYMENT_STATUSES),
    paymentMethodType: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    resolvedAt: z.iso.datetime({ offset: true }).nullable(),
    periodEndsAt: z.iso.datetime({ offset: true }).nullable(),
    refundedAt: z.iso.datetime({ offset: true }).nullable(),
    refundMode: z.enum(REFUND_MODES).nullable(),
  })
  .meta({ id: 'AdminSubscriptionPayment' });

/** Respuesta de `POST /admin/subscription-payments/:reference/refund`: en qué quedó el pago. */
export const RefundResponseSchema = AdminPaymentSchema.pick({
  reference: true,
  status: true,
  periodEndsAt: true,
  refundedAt: true,
  refundMode: true,
}).meta({ id: 'RefundSubscriptionPaymentResponse' });

/** Respuesta de `GET /admin/subscription-payments`. */
export const AdminPaymentsResponseSchema = z
  .object({ items: z.array(AdminPaymentSchema) })
  .meta({ id: 'AdminSubscriptionPayments' });

/** @param entry - Un pago con el nombre de su negocio. */
export function toAdminPayment({
  payment,
  tenantName,
}: PaymentWithTenant): z.output<typeof AdminPaymentSchema> {
  const props = payment.props;
  return {
    reference: props.reference,
    tenantName,
    planCode: props.planCode,
    months: props.months,
    amountInCents: props.amountInCents,
    currency: props.currency,
    status: props.status,
    paymentMethodType: props.paymentMethodType,
    createdAt: props.createdAt.toISOString(),
    resolvedAt: props.resolvedAt?.toISOString() ?? null,
    periodEndsAt: props.periodEndsAt?.toISOString() ?? null,
    refundedAt: props.refund?.refundedAt.toISOString() ?? null,
    refundMode: props.refund?.mode ?? null,
  };
}

/** @param payments - Los pagos con su negocio. */
export const toAdminPaymentsResponse = (
  payments: readonly PaymentWithTenant[],
): z.output<typeof AdminPaymentsResponseSchema> => ({
  items: payments.map(toAdminPayment),
});

/** @param payment - El pago ya reembolsado. */
export function toRefundResponse(
  payment: SubscriptionPayment,
): z.output<typeof RefundResponseSchema> {
  const { props } = payment;
  return {
    reference: props.reference,
    status: props.status,
    periodEndsAt: props.periodEndsAt?.toISOString() ?? null,
    refundedAt: props.refund?.refundedAt.toISOString() ?? null,
    refundMode: props.refund?.mode ?? null,
  };
}
