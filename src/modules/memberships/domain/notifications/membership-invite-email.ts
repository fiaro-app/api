/** El asunto y los dos cuerpos de un correo, listos para enviar. */
export interface EmailContent {
  /** Asunto del correo. */
  readonly subject: string;
  /** Cuerpo en HTML. */
  readonly html: string;
  /** Cuerpo en texto plano. */
  readonly text: string;
}

/**
 * Arma el correo con la contraseña temporal de quien acaba de ser invitado. Es una función pura:
 * no envía nada, solo decide el texto. Canal de cortesía, no el principal: PRODUCT.md §5 ya
 * define que la contraseña se muestra una sola vez en la respuesta para pasarla por WhatsApp,
 * porque muchos cobradores no tienen correo.
 *
 * @param fullName - Nombre de la persona invitada.
 * @param phone - Su celular, para iniciar sesión.
 * @param tempPassword - Su contraseña temporal, en claro.
 */
export function membershipInviteEmail(
  fullName: string,
  phone: string,
  tempPassword: string,
): EmailContent {
  const subject = 'Te invitaron a Fiaro';
  return {
    subject,
    text: `Hola ${fullName}. Ya tienes una cuenta en Fiaro. Celular: ${phone}. Contraseña temporal: ${tempPassword}. Debes cambiarla al iniciar sesión.`,
    html: `<p>Hola ${fullName}. Ya tienes una cuenta en Fiaro.</p><p>Celular: <strong>${phone}</strong></p><p>Contraseña temporal: <strong>${tempPassword}</strong></p><p>Debes cambiarla al iniciar sesión.</p>`,
  };
}
