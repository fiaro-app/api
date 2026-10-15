import type { EmailContent } from '@/modules/auth/domain/notifications/password-reset-email.js';
import { renderEmail } from '@/shared/domain/email/email-layout.js';

/**
 * Arma el correo con el código para verificar el correo de contacto, con el estándar de correos de
 * Fiaro (D-131). Es una función pura: no envía nada, solo decide el texto.
 *
 * @param code - Código de un solo uso, ya generado.
 */
export function contactEmailVerificationEmail(code: string): EmailContent {
  return renderEmail({
    title: 'Verifica tu correo',
    preheader: 'Tu código para verificar el correo vence en 15 minutos.',
    paragraphs: [
      'Usa este código para confirmar que este correo es tuyo. Vence en 15 minutos.',
    ],
    highlight: { label: 'Tu código', value: code },
    footnote: 'Si tú no lo pediste, ignora este correo.',
  });
}
