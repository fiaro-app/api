import { renderEmail } from '@/shared/domain/email/email-layout.js';

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
 * Arma el correo con el código para recuperar la contraseña, con el estándar de correos de Fiaro
 * (D-131). Es una función pura: no envía nada, solo decide el texto.
 *
 * @param code - Código de un solo uso, ya generado.
 */
export function passwordResetEmail(code: string): EmailContent {
  return renderEmail({
    title: 'Recupera tu contraseña',
    preheader: 'Tu código para recuperar la contraseña vence en 15 minutos.',
    paragraphs: [
      'Usa este código para crear una contraseña nueva. Vence en 15 minutos.',
    ],
    highlight: { label: 'Tu código', value: code },
    footnote:
      'Si tú no lo pediste, ignora este correo: tu contraseña no cambia.',
  });
}
