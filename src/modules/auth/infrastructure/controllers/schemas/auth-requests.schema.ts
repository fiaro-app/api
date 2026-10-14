import { MobilePhoneSchema, TurnstileTokenSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/modules/auth/domain/policies/password.policy.js';
import { VERIFICATION_CODE_LENGTH } from '@/modules/auth/domain/policies/verification-code.policy.js';

/**
 * Cuerpo de `POST /auth/sign-in/phone-number`.
 *
 * @remarks
 * La contraseña solo exige no estar vacía: su longitud se valida al crearla o cambiarla, no al
 * usarla, para no revelar la política a quien prueba contraseñas.
 */
export const SignInRequestSchema = z.strictObject({
  phoneNumber: MobilePhoneSchema.meta({
    description: 'Celular colombiano en formato internacional E.164.',
    example: '+573001234567',
  }),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH).meta({
    description: 'Contraseña de la cuenta.',
    example: 'una-contraseña-larga',
  }),
  rememberMe: z.boolean().optional().meta({
    description:
      'Con `false` la cookie no se guarda entre cierres del navegador. Por defecto la sesión dura 30 días.',
  }),
});

/** Cuerpo de `POST /auth/change-password`. */
export const ChangePasswordRequestSchema = z.strictObject({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH).meta({
    description:
      'Contraseña actual. En el primer ingreso de un cobrador es la temporal.',
  }),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .meta({
      description: `Contraseña nueva, de ${String(PASSWORD_MIN_LENGTH)} a ${String(PASSWORD_MAX_LENGTH)} caracteres.`,
      example: 'la-contraseña-nueva-2',
    }),
  revokeOtherSessions: z.boolean().optional().meta({
    description:
      'Se acepta por compatibilidad con el cliente de better-auth, pero no cambia nada: las demás sesiones siempre se revocan.',
  }),
});

/**
 * Cuerpo de `POST /auth/request-password-reset`.
 *
 * @remarks
 * Solo pide el celular: la respuesta es la misma exista o no la cuenta, así que no hace falta
 * saber si tiene correo de contacto para llamarla.
 */
export const RequestPasswordResetRequestSchema = z.strictObject({
  phoneNumber: MobilePhoneSchema.meta({
    description: 'Celular colombiano en formato internacional E.164.',
    example: '+573001234567',
  }),
  turnstileToken: TurnstileTokenSchema.optional(),
});

/** Cuerpo de `POST /auth/reset-password`. */
export const ResetPasswordRequestSchema = z.strictObject({
  phoneNumber: MobilePhoneSchema.meta({
    description: 'Celular colombiano en formato internacional E.164.',
    example: '+573001234567',
  }),
  code: z
    .string()
    .length(VERIFICATION_CODE_LENGTH)
    .regex(/^\d+$/)
    .meta({
      description: `Código de ${String(VERIFICATION_CODE_LENGTH)} dígitos recibido por correo.`,
      example: '048213',
    }),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH)
    .meta({
      description: `Contraseña nueva, de ${String(PASSWORD_MIN_LENGTH)} a ${String(PASSWORD_MAX_LENGTH)} caracteres.`,
      example: 'la-contraseña-nueva-2',
    }),
});
