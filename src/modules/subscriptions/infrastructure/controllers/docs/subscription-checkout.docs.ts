import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  BillingUnavailableSchema,
  CheckoutForbiddenSchema,
  PaymentNotFoundSchema,
  SubscriptionUnauthenticatedSchema,
  WebhookUnauthenticatedSchema,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-errors.schema.js';
import {
  CheckoutResponseSchema,
  CheckoutStatusResponseSchema,
  PaymentHistoryResponseSchema,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-checkout.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `POST /subscription/checkout`. */
export const ApiCreateCheckout = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Crear la orden para pagar el plan',
      description:
        'Crea la orden de pago de un mes del plan (D-149). El monto sale del precio del plan en el servidor. Devuelve los campos que la web manda a la página de pago de Wompi. Solo `OWNER`. Sigue permitida con la suscripción en solo lectura: es la forma de salir de ella. El pago se confirma por el aviso de Wompi, no por la redirección.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Orden creada.',
      standardSchema: CheckoutResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: SubscriptionUnauthenticatedSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o sin rol `OWNER` (`FORBIDDEN`).',
      standardSchema: CheckoutForbiddenSchema,
    }),
    ApiResponse({
      status: 503,
      description:
        'El cobro no está configurado en este entorno (`BILLING_UNAVAILABLE`).',
      standardSchema: BillingUnavailableSchema,
    }),
  );

/** Documenta `GET /subscription/checkout/:reference`. */
export const ApiGetCheckoutStatus = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver en qué quedó una orden de pago',
      description:
        'La página a la que Wompi devuelve a la dueña consulta esta ruta hasta que el estado deje de ser `PENDING`. Solo `OWNER`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'La orden con su estado.',
      standardSchema: CheckoutStatusResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: SubscriptionUnauthenticatedSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o sin rol `OWNER` (`FORBIDDEN`).',
      standardSchema: CheckoutForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description: 'La orden no existe, o es de otro negocio (`NOT_FOUND`).',
      standardSchema: PaymentNotFoundSchema,
    }),
  );

/** Documenta `GET /subscription/payments`. */
export const ApiListPayments = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Historial de pagos del plan',
      description:
        'Las órdenes de pago del negocio (aprobadas, rechazadas y pendientes), de la más reciente a la más vieja, hasta 50. Solo `OWNER`. Es una lectura: sigue disponible con la suscripción en solo lectura.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El historial.',
      standardSchema: PaymentHistoryResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: SubscriptionUnauthenticatedSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o sin rol `OWNER` (`FORBIDDEN`).',
      standardSchema: CheckoutForbiddenSchema,
    }),
  );

/** Documenta `POST /webhooks/wompi`. */
export const ApiWompiWebhook = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Aviso de Wompi (`transaction.updated`)',
      description:
        'Lo llama Wompi, no una app. Sin sesión: se autentica con el checksum SHA-256 del aviso (cabecera `X-Event-Checksum` y `signature.checksum`) calculado con el secreto de eventos. Aprueba o cierra la orden una sola vez, aunque el aviso se repita. Responde 200 (cuerpo vacío) a todo aviso con firma válida, aunque no lo aplique, para que Wompi no reintente.',
    }),
    ApiResponse({
      status: 200,
      description: 'Aviso recibido.',
      standardSchema: z.object({}).meta({ id: 'WompiWebhookAck' }),
    }),
    ApiResponse({
      status: 401,
      description:
        'La firma no coincide o el aviso no tiene la forma esperada (`UNAUTHENTICATED`).',
      standardSchema: WebhookUnauthenticatedSchema,
    }),
  );
