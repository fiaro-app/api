import { MobilePhoneSchema, TurnstileTokenSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/**
 * Cuerpo de `POST /register`.
 *
 * @remarks
 * Solo el celular se valida estricto aquí (`MobilePhoneSchema`, igual que en `SignInRequestSchema`):
 * es el único dato que otro caso de uso no revalida por su cuenta con el contrato completo.
 * El resto (`fullName`, `nationalId`, `businessName`) solo exige no estar vacío: la longitud y el
 * formato reales los aplican `RegisterOwnerUseCase` (`validateUserData`, `validateTenantData`),
 * igual que en `clients`/`lenders`. La contraseña solo exige no estar vacía por la misma razón,
 * además de que su política (`PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH`) vive en el dominio de
 * `auth`, que `tenants` no puede importar (regla de fronteras, ARCHITECTURE.md §3).
 */
export const RegisterOwnerRequestSchema = z.strictObject({
  phone: MobilePhoneSchema.meta({
    description:
      'Celular colombiano en formato internacional E.164; será el usuario de inicio de sesión.',
    example: '+573001234567',
  }),
  fullName: z.string().min(1).meta({
    description: 'Nombre completo.',
    example: 'Ana Pérez',
  }),
  password: z.string().min(1).meta({
    description: 'Contraseña de la cuenta nueva.',
    example: 'una-contraseña-larga',
  }),
  nationalId: z.string().min(1).meta({
    description:
      'Cédula de ciudadanía, con o sin separadores. Obligatoria: quien se registra recibe el rol COLLECTOR, que la exige.',
    example: '1020304050',
  }),
  contactEmail: z.email().optional().meta({
    description:
      'Correo real, opcional: sirve para recuperar la contraseña más adelante.',
    example: 'ana@example.com',
  }),
  businessName: z.string().min(1).meta({
    description: 'Nombre del negocio.',
    example: 'Préstamos Ana Pérez',
  }),
  acceptedTerms: z.literal(true).meta({
    description:
      'Aceptó los Términos y Condiciones. Obligatorio: debe ser `true`.',
  }),
  acceptedPrivacy: z.literal(true).meta({
    description:
      'Autorizó el tratamiento de sus datos según la Política de Privacidad (Ley 1581 de 2012). Obligatorio: debe ser `true`.',
  }),
  acceptedDataResponsibility: z.literal(true).meta({
    description:
      'Se comprometió a tener la autorización de sus clientes y a cumplir la ley en su cobranza. Obligatorio: debe ser `true`.',
  }),
  marketingConsent: z.boolean().default(false).meta({
    description:
      'Autoriza recibir novedades y ofertas. Opcional: nunca condiciona el registro.',
  }),
  legalVersion: z.string().min(1).meta({
    description:
      'Versión de los documentos legales que la persona vio (la vigente está publicada en la web, en `/terminos`). Si ya no es la vigente, el registro responde `P930V`.',
    example: '2026-10-16',
  }),
  turnstileToken: TurnstileTokenSchema.optional(),
});
