import type { EmailContent } from '@/modules/auth/domain/notifications/password-reset-email.js';

/**
 * Arma el correo con el código para verificar el correo de contacto. Es una función pura: no
 * envía nada, solo decide el texto.
 *
 * @param code - Código de un solo uso, ya generado.
 */
export function contactEmailVerificationEmail(code: string): EmailContent {
  return {
    subject: 'Verifica tu correo de Fiaro',
    text: `Tu código para verificar este correo es ${code}. Vence en 15 minutos. Si no lo pediste, ignora este correo.`,
    html: `<p>Tu código para verificar este correo es <strong>${code}</strong>.</p><p>Vence en 15 minutos. Si no lo pediste, ignora este correo.</p>`,
  };
}
