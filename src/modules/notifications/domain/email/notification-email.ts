import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import { renderEmail } from '@/shared/domain/email/email-layout.js';

/** El asunto y los dos cuerpos de un correo de notificación; el destinatario lo pone quien envía. */
export type NotificationEmailContent = Omit<EmailMessage, 'to'>;

/**
 * Arma el correo de una notificación: su título como asunto y su texto como cuerpo, con una línea
 * que remite a la app. Es una función pura: no envía nada, solo decide el texto.
 *
 * @remarks
 * El cuerpo puede traer lo que escribió una persona (la nota con la que se rechaza un cuadre), así
 * que en el HTML se escapa. El correo no lleva un enlace profundo a la notificación: la web es
 * fase 2 (PRODUCT.md §13) y la app móvil abre su propia bandeja.
 *
 * @param title - Título de la notificación, tal como aparece en la app.
 * @param body - Texto de la notificación.
 */
export function notificationEmail(
  title: string,
  body: string,
): NotificationEmailContent {
  return renderEmail({
    title,
    preheader: body,
    paragraphs: [body, 'Abre Fiaro en tu celular para ver los detalles.'],
  });
}
