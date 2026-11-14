import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { ImportResponseSchema } from '@/modules/imports/infrastructure/controllers/schemas/import-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

const ImportForbiddenSchema = ApiErrorSchema.extend({
  code: z.enum([
    'FORBIDDEN',
    'PLAN_FEATURE_UNAVAILABLE',
    'SUBSCRIPTION_READ_ONLY',
  ]),
}).meta({ id: 'ImportForbidden' });

const ImportValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'ImportValidationError' });

const ImportUnauthenticatedSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'ImportUnauthenticated' });

/** Documenta `POST /imports`. */
export const ApiImportRows = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Importar clientes y préstamos en curso',
      description:
        'Revisa (`dryRun: true`) o crea (`dryRun: false`) hasta 200 filas de una hoja: un cliente y, si lo tiene, su préstamo con lo que falta. Un cliente que ya existe se reutiliza. Las filas se crean una a una: una que falla no deshace las demás. Exige rol `OWNER` o `LENDER` y un plan con importación (Pro o Team).',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Resultado fila por fila y totales.',
      standardSchema: ImportResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: ImportValidationErrorSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: ImportUnauthenticatedSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin rol `OWNER` ni `LENDER` (`FORBIDDEN`), el plan no incluye importar (`PLAN_FEATURE_UNAVAILABLE`) o el plan venció (`SUBSCRIPTION_READ_ONLY`).',
      standardSchema: ImportForbiddenSchema,
    }),
  );
