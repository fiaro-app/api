import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  PaymentReversalConflictSchema,
  PaymentReversalForbiddenSchema,
  PaymentReversalNotFoundSchema,
  PaymentReversalValidationErrorSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/payment-reversal-errors.schema.js';
import { PaymentReversalResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/payment-reversal-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'PaymentReversalUnauthenticated' });

/** Documenta `POST /payments/:id/reversals`. */
export const ApiCreatePaymentReversal = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Corregir un pago (anularlo por completo)',
      description:
        'El pago queda intacto; la reversión es lo que deja de contarlo para el saldo. Un pago se reversa una sola vez: si el monto correcto era otro, se registra un pago nuevo en una visita aparte. Si el préstamo ya estaba PAID_OFF, vuelve a ACTIVE cuando la reversión deja saldo pendiente. Exige rol LENDER en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Reversión creada.',
      standardSchema: PaymentReversalResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El motivo falta o está vacío (`VALIDATION_FAILED`).',
      standardSchema: PaymentReversalValidationErrorSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol LENDER (`FORBIDDEN`).',
      standardSchema: PaymentReversalForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description: 'El pago no existe, o es de otro prestamista (`NOT_FOUND`).',
      standardSchema: PaymentReversalNotFoundSchema,
    }),
    ApiResponse({
      status: 409,
      description: 'Ese pago ya tiene una reversión (`CONFLICT`).',
      standardSchema: PaymentReversalConflictSchema,
    }),
  );
