import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `409 CONTACT_EMAIL_NOT_SET`: la cuenta no tiene un correo de contacto registrado. */
export const ContactEmailNotSetSchema = ApiErrorSchema.extend({
  code: z.literal('CONTACT_EMAIL_NOT_SET'),
}).meta({ id: 'ContactEmailNotSet' });

/** `409 CONTACT_EMAIL_ALREADY_VERIFIED`: el correo de contacto ya está verificado. */
export const ContactEmailAlreadyVerifiedSchema = ApiErrorSchema.extend({
  code: z.literal('CONTACT_EMAIL_ALREADY_VERIFIED'),
}).meta({ id: 'ContactEmailAlreadyVerified' });

/** `400 CONTACT_EMAIL_VERIFICATION_CODE_INVALID`: el código no es correcto, ya se usó o se agotaron los intentos. */
export const ContactEmailVerificationCodeInvalidSchema = ApiErrorSchema.extend({
  code: z.literal('CONTACT_EMAIL_VERIFICATION_CODE_INVALID'),
}).meta({ id: 'ContactEmailVerificationCodeInvalid' });

/** `400 CONTACT_EMAIL_VERIFICATION_CODE_EXPIRED`: el código venció. */
export const ContactEmailVerificationCodeExpiredSchema = ApiErrorSchema.extend({
  code: z.literal('CONTACT_EMAIL_VERIFICATION_CODE_EXPIRED'),
}).meta({ id: 'ContactEmailVerificationCodeExpired' });
