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
