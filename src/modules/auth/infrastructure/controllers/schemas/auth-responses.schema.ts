import { z } from 'zod';
import {
  AuthSessionSchema,
  AuthUserSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-user.schema.js';

/** Respuesta de `POST /auth/sign-in/phone-number`. */
export const SignInResponseSchema = z
  .object({
    token: z.string().meta({ description: 'Token de la sesión nueva.' }),
    user: AuthUserSchema,
  })
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

/** Respuesta de `POST /auth/change-password`. */
export const ChangePasswordResponseSchema = z
  .object({
    token: z.string().nullable().meta({
      description: 'Token de la sesión nueva que reemplaza a la anterior.',
    }),
    user: AuthUserSchema,
  })
  .meta({ id: 'ChangePasswordResponse' });
