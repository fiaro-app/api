import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  LenderForbiddenSchema,
  LenderValidationErrorSchema,
} from '@/modules/lenders/infrastructure/controllers/schemas/lender-errors.schema.js';
import { LenderLogoUploadUrlResponseSchema } from '@/modules/lenders/infrastructure/controllers/schemas/lender-logo-responses.schema.js';
import { LenderResponseSchema } from '@/modules/lenders/infrastructure/controllers/schemas/lender-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'LenderUnauthenticated' });

/** El 401 de toda ruta protegida: sin sesión vigente. */
const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

/** El 403 de `LenderScopeGuard`: sin ninguna membresía activa. */
const ApiNoActiveMembershipResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'La sesión no tiene ninguna membresía activa con un prestamista (`FORBIDDEN`).',
    standardSchema: LenderForbiddenSchema,
  });

/** Documenta `GET /lender`. */
export const ApiGetLender = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver la configuración del prestamista',
      description:
        'El prestamista con el que opera la sesión, resuelto por `LenderScopeGuard` a partir de la membresía activa. Cualquier rol puede verla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Configuración del prestamista.',
      standardSchema: LenderResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
  );

/** Documenta `PATCH /lender`. */
export const ApiUpdateLender = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Actualizar la configuración del prestamista',
      description:
        'Un campo ausente no se toca. El resultado completo se revalida con el mismo contrato del alta (`LenderSchema`). Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Configuración actualizada.',
      standardSchema: LenderResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: LenderValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: LenderForbiddenSchema,
    }),
  );

/** Documenta `POST /lender/logo-upload-url`. */
export const ApiGetLenderLogoUploadUrl = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Pedir una URL para subir el logo',
      description:
        'Una URL firmada de subida (PUT) y la URL pública del logo una vez subido, para el bucket S3/R2 configurado (D-102). El archivo va directo del dispositivo al bucket: la API nunca lo recibe. Guardar la URL pública exige, aparte, PATCH /lender { logoUrl }. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'La URL firmada y la URL pública.',
      standardSchema: LenderLogoUploadUrlResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: LenderValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: LenderForbiddenSchema,
    }),
  );
