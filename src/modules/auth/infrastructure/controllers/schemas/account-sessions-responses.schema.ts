import { z } from 'zod';
import type { AccountSession } from '@/modules/auth/application/dtos/account-session.dto.js';

/** Una sesión abierta de la persona. */
export const AccountSessionResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la sesión.' }),
    isCurrent: z.boolean().meta({
      description:
        'Si es la sesión desde la que se hizo la consulta: «Esta sesión».',
    }),
    device: z
      .object({
        client: z.string().nullable().meta({
          description:
            'El navegador o la app (`Chrome`, `Safari`, `App móvil`...); null si no se reconoce.',
        }),
        os: z.string().nullable().meta({
          description:
            'El sistema operativo (`Windows`, `macOS`, `Android`, `iOS`...); null si no se reconoce.',
        }),
        label: z.string().meta({
          description: 'Texto listo para mostrar: «Chrome en Windows».',
          example: 'Chrome en Windows',
        }),
      })
      .meta({ id: 'AccountSessionDevice', description: 'Qué dispositivo es.' }),
    ipAddress: z.string().nullable().meta({
      description: 'IP desde la que se abrió; null si no se registró.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se abrió.',
    }),
    lastUsedAt: z.iso.datetime({ offset: true }).meta({
      description:
        'Último uso, con precisión de un día: la sesión se renueva como máximo una vez al día.',
    }),
    expiresAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo vence si no se usa (30 días sin actividad).',
    }),
  })
  .meta({ id: 'AccountSessionResponse' });

/** Respuesta de `GET /account/sessions`: la actual primero no está garantizada, `isCurrent` la marca. */
export const AccountSessionsResponseSchema = z
  .array(AccountSessionResponseSchema)
  .meta({ id: 'AccountSessionsResponse' });

/** @param sessions - Las sesiones, tal como las devuelve el caso de uso. */
export function toAccountSessionsResponse(
  sessions: readonly AccountSession[],
): z.output<typeof AccountSessionsResponseSchema> {
  return sessions.map((session) => ({
    id: session.id,
    isCurrent: session.isCurrent,
    device: session.device,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  }));
}
