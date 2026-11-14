import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AdminPaymentsResponseSchema,
  RefundResponseSchema,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-refund.schema.js';
import {
  PaymentNotFoundSchema,
  PaymentNotRefundableSchema,
  PlatformAdminForbiddenSchema,
  RefundGatewayFailedSchema,
  RefundMethodUnsupportedSchema,
  SubscriptionUnauthenticatedSchema,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-errors.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `GET /admin/subscription-payments`. */
export const ApiListAdminPayments = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver los pagos del plan de todos los negocios',
      description:
        'Los últimos 50 pagos del plan de todos los negocios, del más reciente al más viejo, con el nombre del negocio (D-156). Solo quien opera la plataforma (`PLATFORM_ADMIN_PHONES`).',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Los pagos.',
      standardSchema: AdminPaymentsResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: SubscriptionUnauthenticatedSchema,
    }),
    ApiResponse({
      status: 403,
      description: 'La persona no opera la plataforma (`FORBIDDEN`).',
      standardSchema: PlatformAdminForbiddenSchema,
    }),
  );

/** Documenta `POST /admin/subscription-payments/:reference/refund`. */
export const ApiRefundPayment = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Devolver un pago del plan',
      description:
        'Devuelve por completo un pago aprobado (D-156): el pago pasa a `REFUNDED` y la suscripción pierde los meses que ese pago había sumado (puede quedar en gracia o solo lectura). `mode: WOMPI_VOID` pide antes a Wompi anular la transacción (solo pagos con tarjeta y con `WOMPI_PRIVATE_KEY` configurada); `mode: MANUAL` solo registra una devolución hecha por otro lado, con su referencia. Queda auditado. Solo quien opera la plataforma.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El pago ya reembolsado.',
      standardSchema: RefundResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: SubscriptionUnauthenticatedSchema,
    }),
    ApiResponse({
      status: 403,
      description: 'La persona no opera la plataforma (`FORBIDDEN`).',
      standardSchema: PlatformAdminForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description: 'La referencia no es de ninguna orden (`NOT_FOUND`).',
      standardSchema: PaymentNotFoundSchema,
    }),
    ApiResponse({
      status: 422,
      description:
        'El pago no está aprobado o ya se devolvió (`PAYMENT_NOT_REFUNDABLE`), o no se puede anular en Wompi (`REFUND_METHOD_UNSUPPORTED`).',
      standardSchema: PaymentNotRefundableSchema.or(
        RefundMethodUnsupportedSchema,
      ),
    }),
    ApiResponse({
      status: 503,
      description: 'Wompi no aceptó la anulación (`REFUND_GATEWAY_FAILED`).',
      standardSchema: RefundGatewayFailedSchema,
    }),
  );
