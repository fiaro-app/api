import { z } from 'zod';
import { VERIFICATION_CODE_LENGTH } from '@/modules/auth/domain/policies/verification-code.policy.js';

/** Cuerpo de `POST /account/contact-email/verify`. */
export const VerifyContactEmailRequestSchema = z.strictObject({
  code: z
    .string()
    .length(VERIFICATION_CODE_LENGTH)
    .regex(/^\d+$/)
    .meta({
      description: `Código de ${String(VERIFICATION_CODE_LENGTH)} dígitos recibido por correo.`,
      example: '048213',
    }),
});

/**
 * Cuerpo de `PATCH /account/profile`.
 *
 * @remarks
 * Un campo ausente no se toca; `contactEmail: null` lo quita. Al menos uno de los dos tiene que
 * venir: un cuerpo vacío no tiene sentido.
 */
export const UpdateProfileRequestSchema = z
  .strictObject({
    fullName: z.string().min(1).optional().meta({
      description: 'Nombre completo nuevo. Ausente si no cambia.',
      example: 'Ana Pérez Gómez',
    }),
    contactEmail: z.email().nullable().optional().meta({
      description:
        'Correo real nuevo; `null` lo quita. Ausente si no cambia. Cambiarlo o quitarlo reinicia la verificación (D-69) y, si queda uno, manda un código nuevo.',
      example: 'ana@example.com',
    }),
  })
  .refine(
    (body) => body.fullName !== undefined || body.contactEmail !== undefined,
    { message: 'Debes enviar al menos un campo para actualizar.' },
  );
