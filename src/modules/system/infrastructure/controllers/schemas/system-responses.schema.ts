import { AppVersionSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { HealthStatus } from '@/modules/system/application/dtos/health-status.dto.js';
import type { MobileVersionDetails } from '@/modules/system/application/dtos/mobile-version-details.dto.js';

/** Respuesta de `GET /health`. */
export const HealthResponseSchema = z
  .object({
    status: z.literal('ok').meta({ description: 'Siempre `ok`.' }),
    version: z.string().meta({ description: 'Versión desplegada de la API.' }),
  })
  .meta({ id: 'HealthResponse' });

/** Respuesta de `GET /mobile/version`. */
export const MobileVersionResponseSchema = z
  .object({
    minimumSupportedVersion: AppVersionSchema.meta({
      description:
        'Por debajo de esta versión, la app bloquea con una pantalla de actualización.',
    }),
    latestVersion: AppVersionSchema.meta({
      description: 'La versión más reciente publicada.',
    }),
    downloadUrl: z.url().meta({
      description: 'Dónde descargar el APK más reciente.',
    }),
  })
  .meta({ id: 'MobileVersionResponse' });

/** @param status - El resultado del healthcheck, tal como lo devuelve el caso de uso. */
export function toHealthResponse(
  status: HealthStatus,
): z.output<typeof HealthResponseSchema> {
  return { status: status.status, version: status.version };
}

/** @param details - La configuración del version-gate, tal como la devuelve el caso de uso. */
export function toMobileVersionResponse(
  details: MobileVersionDetails,
): z.output<typeof MobileVersionResponseSchema> {
  return {
    minimumSupportedVersion: details.minimumSupportedVersion,
    latestVersion: details.latestVersion,
    downloadUrl: details.downloadUrl,
  };
}
