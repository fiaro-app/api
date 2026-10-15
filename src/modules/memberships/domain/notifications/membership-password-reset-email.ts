import type { EmailContent } from '@/modules/memberships/domain/notifications/membership-invite-email.js';
import { renderEmail } from '@/shared/domain/email/email-layout.js';

/**
 * Arma el correo con la contraseña temporal nueva de quien administra le restableció, con el
 * estándar de correos de Fiaro (D-131). Es una función pura: no envía nada, solo decide el texto.
 *
 * @param fullName - Nombre de la persona.
 * @param phone - Su celular, para iniciar sesión.
 * @param tempPassword - Su contraseña temporal nueva, en claro.
 */
export function membershipPasswordResetEmail(
  fullName: string,
  phone: string,
  tempPassword: string,
): EmailContent {
  return renderEmail({
    title: 'Tu contraseña cambió',
    preheader: 'Te restablecieron la contraseña: usa la temporal para entrar.',
    paragraphs: [
      `Hola ${fullName}, te restablecieron la contraseña de Fiaro.`,
      `Inicia sesión con tu celular ${phone} y esta contraseña temporal. Te pediremos cambiarla al entrar.`,
    ],
    highlight: { label: 'Contraseña temporal', value: tempPassword },
    footnote:
      'Si no esperabas este cambio, avisa a quien administra tu negocio.',
  });
}
