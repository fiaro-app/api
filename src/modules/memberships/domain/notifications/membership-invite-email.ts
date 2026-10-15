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
 * Arma el correo con la contraseña temporal de quien acaba de ser invitado, con el estándar de
 * correos de Fiaro (D-131). Es una función pura: no envía nada, solo decide el texto. Canal de
 * cortesía, no el principal: PRODUCT.md §5 ya define que la contraseña se muestra una sola vez en
 * la respuesta para pasarla por WhatsApp, porque muchos cobradores no tienen correo.
 *
 * @remarks
 * El nombre es texto libre que escribe quien invita; `renderEmail` lo escapa en el HTML.
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
  return renderEmail({
    title: 'Te invitaron a Fiaro',
    preheader:
      'Ya tienes una cuenta: entra con tu celular y la contraseña temporal.',
    paragraphs: [
      `Hola ${fullName}, ya tienes una cuenta en Fiaro.`,
      `Inicia sesión con tu celular ${phone} y esta contraseña temporal. Te pediremos cambiarla al entrar.`,
    ],
    highlight: { label: 'Contraseña temporal', value: tempPassword },
    footnote: 'Si no esperabas esta invitación, ignora este correo.',
  });
}
