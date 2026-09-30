import { Logger } from '@nestjs/common';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

/**
 * Cuánto se espera a que Resend responda antes de dar el correo por no enviado. El SDK de Resend
 * no trae su propio límite: si la conexión TCP se queda a medias, la promesa que devuelve nunca
 * se resuelve ni se rechaza.
 */
const SEND_TIMEOUT_MS = 10_000;

/** Cuántos correos pueden estar esperando a Resend a la vez; los demás se descartan. */
const MAX_PENDING = 50;

/**
 * Lo que {@link ResendEmailSender} necesita del cliente de Resend. Con esta forma estrecha (en
 * vez del tipo `Resend` del SDK, una clase con miembros privados) una prueba le pasa un cliente
 * falso sin instanciar el real.
 */
export interface ResendClient {
  emails: {
    send(payload: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    }): Promise<{
      data: { id: string } | null;
      error: { message: string; name: string } | null;
    }>;
  };
}

/**
 * Envía correos con Resend.
 *
 * @remarks
 * Cumple el contrato del puerto: `send` no espera ni falla. La llamada al SDK se hace por detrás,
 * con un límite propio de tiempo ({@link SEND_TIMEOUT_MS}), porque el SDK de Resend no trae uno:
 * una conexión TCP atascada deja la promesa sin resolver para siempre. Si Resend no responde a
 * tiempo o devuelve un error, se escribe en el log y se sigue; nunca se reintenta ni se reporta al
 * llamador. Como una conexión atascada podría acumular correos sin límite, se cuentan los que
 * están pendientes y, pasado {@link MAX_PENDING}, se descartan.
 */
export class ResendEmailSender implements EmailSender {
  private pending = 0;

  /**
   * @param resend - Cliente de Resend ya autenticado con la API key.
   * @param fromAddress - Dirección remitente verificada en Resend.
   * @param logger - Dónde se escriben las fallas.
   */
  constructor(
    private readonly resend: ResendClient,
    private readonly fromAddress: string,
    private readonly logger: Pick<Logger, 'error'> = new Logger(
      'ResendEmailSender',
    ),
  ) {}

  /** @param message - El correo a enviar. */
  send(message: EmailMessage): void {
    if (this.pending >= MAX_PENDING) {
      this.logger.error(
        `Resend no responde y hay ${String(MAX_PENDING)} correos esperando: se descarta el correo a ${message.to}.`,
      );
      return;
    }
    this.pending += 1;
    void this.doSend(message)
      .catch((error: unknown) => {
        this.logger.error(
          `No se pudo enviar el correo a ${message.to}: ${error instanceof Error ? error.message : 'error desconocido'}.`,
        );
      })
      .finally(() => {
        this.pending -= 1;
      });
  }

  private async doSend(message: EmailMessage): Promise<void> {
    const { error } = await withTimeout(
      this.resend.emails.send({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      SEND_TIMEOUT_MS,
    );
    if (error) {
      throw new Error(error.message);
    }
  }
}
