import { Logger } from '@nestjs/common';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

/** Cuánto se espera a Mailpit antes de dar el correo por no enviado. */
const SEND_TIMEOUT_MS = 5000;

/** Remitente cuando no hay `RESEND_FROM_EMAIL`: en Mailpit no hace falta un dominio verificado. */
export const MAILPIT_DEFAULT_FROM = 'Fiaro <no-reply@fiaro.dev>';

/** Separa `Nombre <correo>` en las dos partes que pide la API de Mailpit. */
function parseAddress(address: string): { Email: string; Name: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(address);
  return match
    ? { Name: match[1] ?? '', Email: match[2] ?? address }
    : { Name: '', Email: address.trim() };
}

/**
 * Envía los correos a Mailpit (la bandeja de prueba del stack de desarrollo) por su API HTTP
 * `POST /api/v1/send`, para revisar contenido y estilos en `http://localhost:8025` sin mandar
 * nada a nadie de verdad.
 *
 * @remarks
 * Cumple el contrato del puerto igual que `ResendEmailSender`: `send` no espera ni falla; si
 * Mailpit no responde, se escribe en el log y se sigue.
 */
export class MailpitEmailSender implements EmailSender {
  /**
   * @param baseUrl - Origen de Mailpit, p. ej. `http://mailpit:8025`.
   * @param fromAddress - Remitente, con o sin nombre (`Fiaro <no-reply@fiaro.dev>`).
   * @param logger - Dónde se escriben las fallas.
   */
  constructor(
    private readonly baseUrl: string,
    private readonly fromAddress: string,
    private readonly logger: Pick<Logger, 'error'> = new Logger(
      'MailpitEmailSender',
    ),
  ) {}

  /** @param message - El correo a enviar. */
  send(message: EmailMessage): void {
    void this.doSend(message).catch((error: unknown) => {
      this.logger.error(
        `No se pudo dejar el correo a ${message.to} en Mailpit: ${error instanceof Error ? error.message : 'error desconocido'}.`,
      );
    });
  }

  private async doSend(message: EmailMessage): Promise<void> {
    const response = await withTimeout(
      fetch(new URL('/api/v1/send', this.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          From: parseAddress(this.fromAddress),
          To: [parseAddress(message.to)],
          Subject: message.subject,
          HTML: message.html,
          Text: message.text,
        }),
      }),
      SEND_TIMEOUT_MS,
    );
    if (!response.ok) {
      throw new Error(`Mailpit respondió ${String(response.status)}`);
    }
  }
}
