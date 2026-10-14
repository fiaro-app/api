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
