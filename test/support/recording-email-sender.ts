import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';

/**
 * Guarda los correos en memoria en vez de enviarlos: cada prueba lee `sent` para comprobar a quién
 * llegó cada aviso y con qué asunto y texto. Lo usa `startTestApp` en lugar del adaptador real.
 */
export class RecordingEmailSender implements EmailSender {
  /** Los correos que se habrían enviado, en el orden en que se pidieron. */
  readonly sent: EmailMessage[] = [];

  /** @param message - El correo que se habría enviado. */
  send(message: EmailMessage): void {
    this.sent.push(message);
  }
}
