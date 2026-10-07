import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NotificationEmailReader } from '@/modules/auth/application/ports/notification-email-reader.port.js';
import { NOTIFICATION_EMAIL_READER } from '@/modules/auth/application/ports/notification-email-reader.token.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import { notificationEmail } from '@/modules/notifications/domain/email/notification-email.js';
import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';

/**
 * Entrega una notificación ya guardada por los canales de quien la recibe. Hoy el único canal es
 * el correo, y sale hacia el correo que `auth` dice que es de la persona: uno verificado y de una
 * cuenta activa (D-94). Sin verificar, el correo podría ser de otra persona.
 *
 * @remarks
 * Nunca falla. Quien la crea (`CreateNotificationUseCase`) ya guardó la notificación en el feed
 * antes de llamar aquí, y un canal caído no debe tumbar la acción que la originó: el cuadre o la
 * asignación ya quedaron guardados, y un error en este paso llegaría al cliente como un 500 que
 * no dice la verdad. La falla se escribe en el log con el id de la notificación, sin el correo
 * ni el texto.
 */
@Injectable()
export class DeliverNotificationUseCase {
  private readonly logger = new Logger(DeliverNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_EMAIL_READER)
    private readonly emailReader: NotificationEmailReader,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  /** @param notification - La notificación recién guardada. */
  async execute(notification: Notification): Promise<void> {
    try {
      const to = await this.emailReader.findVerifiedContactEmail(
        notification.recipientUserId,
      );
      if (to !== null) {
        this.emailSender.send({
          to,
          ...notificationEmail(notification.title, notification.body),
        });
      }
    } catch (error) {
      this.logger.error(
        `No se pudo entregar la notificación ${notification.id}: ${String(error)}.`,
      );
    }
  }
}
