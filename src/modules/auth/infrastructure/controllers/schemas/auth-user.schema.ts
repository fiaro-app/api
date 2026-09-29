import {
  IdSchema,
  MobilePhoneSchema,
  NationalIdSchema,
} from '@fiaro-app/contracts';
import { z } from 'zod';

const timestamp = (description: string) =>
  z.iso.datetime().meta({ description });

/** Persona autenticada, con los nombres de campo de better-auth. */
export const AuthUserSchema = z
  .object({
    id: IdSchema.meta({ description: 'Identificador de la persona (UUIDv7).' }),
    name: z.string().meta({ description: 'Nombre completo.' }),
    phoneNumber: MobilePhoneSchema.meta({
      description: 'Celular con el que inicia sesión, en formato E.164.',
    }),
    phoneNumberVerified: z.boolean().meta({
      description: 'Siempre `false`: el celular no se verifica por código.',
    }),
    contactEmail: z.email().nullable().meta({
      description: 'Correo real de la persona; es opcional (D-07).',
    }),
    contactEmailVerified: z.boolean().meta({
      description:
        'Si `contactEmail` se verificó con el código que se le mandó.',
    }),
    nationalId: NationalIdSchema.nullable().meta({
      description:
        'Cédula de ciudadanía; obligatoria solo para los cobradores.',
    }),
    mustChangePassword: z.boolean().meta({
      description:
        'La contraseña actual es temporal: hasta cambiarla, las rutas protegidas responden 403 `PASSWORD_CHANGE_REQUIRED`.',
    }),
    email: z.string().meta({
      description:
        'Dirección técnica que better-auth exige, derivada del celular. No es un buzón real: el correo de la persona es `contactEmail`.',
      example: '573001234567@phone.fiaro.invalid',
    }),
    emailVerified: z.boolean().meta({ description: 'Siempre `false`.' }),
    image: z.string().nullable().meta({ description: 'Sin uso por ahora.' }),
    createdAt: timestamp('Cuándo se creó la cuenta.'),
    updatedAt: timestamp('Cuándo cambió por última vez.'),
  })
  .meta({ id: 'AuthUser' });

/** Sesión abierta en un dispositivo. Su token no se expone: solo viaja en la cookie. */
export const AuthSessionSchema = z
  .object({
    id: IdSchema.meta({ description: 'Identificador de la sesión.' }),
    userId: IdSchema.meta({ description: 'Persona a la que pertenece.' }),
    expiresAt: timestamp(
      'Cuándo vence si no se usa; cada día de uso la renueva 30 días.',
    ),
    ipAddress: z
      .string()
      .nullable()
      .meta({ description: 'IP desde la que se abrió.' }),
    userAgent: z
      .string()
      .nullable()
      .meta({ description: 'Aplicación o navegador que la abrió.' }),
    createdAt: timestamp('Cuándo se abrió.'),
    updatedAt: timestamp('Última renovación.'),
  })
  .meta({ id: 'AuthSession' });
