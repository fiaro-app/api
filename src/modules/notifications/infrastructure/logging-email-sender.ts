import { Logger } from '@nestjs/common';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';

/**
 * Sustituto de desarrollo: en vez de enviar el correo, lo escribe en el log. Así el resto de la
 * aplicación funciona sin una cuenta de Resend ni un dominio verificado.
 *
 * @remarks
 * No usa Mailpit ni ningún servidor SMTP local: solo el log, que ya es donde se revisa en
 * desarrollo.
 */
export class LoggingEmailSender implements EmailSender {
  /** @param logger - Dónde se escribe el correo. */
  constructor(
    private readonly logger: Pick<Logger, 'log'> = new Logger(
      'LoggingEmailSender',
    ),
  ) {}

  /** @param message - El correo que se habría enviado. */
  send(message: EmailMessage): void {
    this.logger.log(
      `Correo (modo desarrollo, no se envía) para ${message.to} — asunto: "${message.subject}" — texto: ${message.text}`,
    );
  }
}
