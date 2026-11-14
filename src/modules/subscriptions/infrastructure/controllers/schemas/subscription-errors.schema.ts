import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
export const SubscriptionUnauthenticatedSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'SubscriptionUnauthenticated' });

/** `403 FORBIDDEN`: la sesión no tiene ninguna membresía activa. */
export const SubscriptionForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'SubscriptionForbidden' });

/** `404 NOT_FOUND`: el negocio no tiene suscripción (alta caída a medias). */
export const SubscriptionNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'SubscriptionNotFound' });

/** `403 FORBIDDEN`: la sesión no tiene el rol `OWNER`. */
export const CheckoutForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'CheckoutForbidden' });

/** `503 BILLING_UNAVAILABLE`: faltan las llaves de Wompi en este entorno. */
export const BillingUnavailableSchema = ApiErrorSchema.extend({
  code: z.literal('BILLING_UNAVAILABLE'),
}).meta({ id: 'BillingUnavailable' });

/** `404 NOT_FOUND`: la orden no existe para el negocio. */
export const PaymentNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'SubscriptionPaymentNotFound' });

/** `401 UNAUTHENTICATED`: el aviso de Wompi no trae una firma válida. */
export const WebhookUnauthenticatedSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'WompiWebhookUnauthenticated' });

/** `403 FORBIDDEN`: la persona no opera la plataforma (`PLATFORM_ADMIN_PHONES`). */
export const PlatformAdminForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'PlatformAdminForbidden' });

/** `422 PAYMENT_NOT_REFUNDABLE`: el pago no está aprobado o ya se devolvió. */
export const PaymentNotRefundableSchema = ApiErrorSchema.extend({
  code: z.literal('PAYMENT_NOT_REFUNDABLE'),
}).meta({ id: 'PaymentNotRefundable' });

/** `422 REFUND_METHOD_UNSUPPORTED`: no se puede anular ese pago en Wompi. */
export const RefundMethodUnsupportedSchema = ApiErrorSchema.extend({
  code: z.literal('REFUND_METHOD_UNSUPPORTED'),
}).meta({ id: 'RefundMethodUnsupported' });

/** `503 REFUND_GATEWAY_FAILED`: Wompi no aceptó la anulación. */
export const RefundGatewayFailedSchema = ApiErrorSchema.extend({
  code: z.literal('REFUND_GATEWAY_FAILED'),
}).meta({ id: 'RefundGatewayFailed' });
