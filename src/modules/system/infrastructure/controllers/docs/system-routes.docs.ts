import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MaintenanceErrorSchema } from '@/modules/system/infrastructure/controllers/schemas/system-errors.schema.js';
import {
  HealthResponseSchema,
  MobileVersionResponseSchema,
} from '@/modules/system/infrastructure/controllers/schemas/system-responses.schema.js';

/** Documenta `GET /health`. */
export const ApiGetHealth = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Estado del servicio',
      description:
        'Healthcheck HTTP, sin sesión ni límite de tasa: lo consulta el orquestador (Fly.io), no una persona. Responde sin importar la versión pedida en `API-Version`.',
    }),
    ApiResponse({
      status: 200,
      description: 'El servicio está disponible.',
      standardSchema: HealthResponseSchema,
    }),
    ApiResponse({
      status: 503,
      description: 'Operaciones declaró una ventana de mantenimiento.',
      standardSchema: MaintenanceErrorSchema,
    }),
  );

/** Documenta `GET /mobile/version`. */
export const ApiGetMobileVersion = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Version-gate de la app móvil',
      description:
        'La app la consulta antes de mostrar cualquier pantalla, sin sesión. Compara su propia versión contra `minimumSupportedVersion` con `compareAppVersions` de `@fiaro-app/contracts`. Responde sin importar la versión pedida en `API-Version`.',
    }),
    ApiResponse({
      status: 200,
      description: 'Versión mínima y más reciente configuradas.',
      standardSchema: MobileVersionResponseSchema,
    }),
  );
