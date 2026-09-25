import { z } from 'zod';
import {
  AuthSessionSchema,
  AuthUserSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-user.schema.js';

/**
 * Respuesta de `POST /auth/sign-in/phone-number`. El token de la sesión no viaja en el cuerpo:
 * solo en la cookie.
 */
export const SignInResponseSchema = z
  .object({ user: AuthUserSchema })
  .meta({ id: 'SignInResponse' });

/** Respuesta de `GET /auth/get-session`: la sesión y su persona, o `null` si no hay sesión vigente. */
export const SessionResponseSchema = z
  .object({ session: AuthSessionSchema, user: AuthUserSchema })
  .nullable()
  .meta({ id: 'SessionResponse' });

/** Respuesta de `POST /auth/sign-out`. */
export const SignOutResponseSchema = z
  .object({ success: z.literal(true) })
  .meta({ id: 'SignOutResponse' });

/**
 * Respuesta de `POST /auth/change-password`. La sesión nueva que reemplaza a la anterior llega
 * en la cookie, no en el cuerpo.
 */
export const ChangePasswordResponseSchema = z
  .object({ user: AuthUserSchema })
  .meta({ id: 'ChangePasswordResponse' });

/** Respuesta de `POST /auth/revoke-other-sessions` y de `POST /auth/revoke-sessions`. */
export const StatusResponseSchema = z
  .object({ status: z.literal(true) })
  .meta({ id: 'StatusResponse' });
