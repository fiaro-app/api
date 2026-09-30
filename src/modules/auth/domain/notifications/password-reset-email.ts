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
 * Arma el correo con el código para recuperar la contraseña. Es una función pura: no envía nada,
 * solo decide el texto.
 *
 * @param code - Código de un solo uso, ya generado.
 */
export function passwordResetEmail(code: string): EmailContent {
  const subject = 'Recupera tu contraseña de Fiaro';
  return {
    subject,
    text: `Tu código para recuperar la contraseña es ${code}. Vence en 15 minutos. Si no lo pediste, ignora este correo.`,
    html: `<p>Tu código para recuperar la contraseña es <strong>${code}</strong>.</p><p>Vence en 15 minutos. Si no lo pediste, ignora este correo.</p>`,
  };
}
