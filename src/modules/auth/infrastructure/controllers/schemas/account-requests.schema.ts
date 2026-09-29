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
