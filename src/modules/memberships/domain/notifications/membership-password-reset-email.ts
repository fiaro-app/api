import type { EmailContent } from '@/modules/memberships/domain/notifications/membership-invite-email.js';
import { escapeHtml } from '@/shared/domain/text/escape-html.js';

/**
 * Arma el correo con la contraseña temporal nueva de un colaborador al que un `OWNER`/`LENDER` le
 * restableció la contraseña (D-93). Es una función pura: no envía nada, solo decide el texto.
 * Canal de cortesía, no el principal: la contraseña se muestra una sola vez en la respuesta de
 * `POST /memberships/:id/reset-password`, para pasarla por WhatsApp, como en la invitación (D-81).
 *
 * @remarks
 * El nombre se escapa en el HTML por la misma razón que en la invitación
 * ({@link membershipInviteEmail}): es texto libre.
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
  const subject = 'Tu contraseña de Fiaro cambió';
  return {
    subject,
    text: `Hola ${fullName}. Te restablecieron la contraseña de Fiaro. Celular: ${phone}. Contraseña temporal: ${tempPassword}. Debes cambiarla al iniciar sesión.`,
    html: `<p>Hola ${escapeHtml(fullName)}. Te restablecieron la contraseña de Fiaro.</p><p>Celular: <strong>${phone}</strong></p><p>Contraseña temporal: <strong>${tempPassword}</strong></p><p>Debes cambiarla al iniciar sesión.</p>`,
  };
}
