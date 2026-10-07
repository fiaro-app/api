import { z } from 'zod';

/**
 * Un token de Expo, con la forma `ExponentPushToken[...]` que entrega la app al pedirlo a Expo
 * (D-95). El contenido entre corchetes es alfanumérico, con guion o guion bajo.
 */
export const ExpoPushTokenSchema = z
  .string()
  .regex(/^ExponentPushToken\[[\w-]{1,128}\]$/)
  .meta({
    description:
      'Token de Expo del dispositivo, con la forma ExponentPushToken[...].',
  });

/** Cuerpo de `POST /push-tokens` y de `POST /push-tokens/revoke`: el token del dispositivo. */
export const PushTokenRequestSchema = z.object({
  token: ExpoPushTokenSchema,
});
