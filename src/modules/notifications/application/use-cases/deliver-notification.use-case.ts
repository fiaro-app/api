import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  NotificationRecipient,
  NotificationRecipientReader,
} from '@/modules/auth/application/ports/notification-recipient-reader.port.js';
import { NOTIFICATION_RECIPIENT_READER } from '@/modules/auth/application/ports/notification-recipient-reader.token.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import type { PushSender } from '@/modules/notifications/application/ports/push-sender.port.js';
import { PUSH_SENDER } from '@/modules/notifications/application/ports/push-sender.token.js';
import { notificationEmail } from '@/modules/notifications/domain/email/notification-email.js';
import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import { pushMessageFor } from '@/modules/notifications/domain/push-message.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';
import { PUSH_TOKEN_REPOSITORY } from '@/modules/notifications/domain/tokens/push-token-repository.token.js';

/**
 * El correo es para lo necesario: lo crítico (`ALERT`) siempre, y lo que merece atención
 * (`WARNING`) solo si no hay un celular al que mandárselo. Lo demás llega únicamente como push y
 * en el feed de la app. La excepción es el comprobante de un pago de la suscripción (`SUCCESS` sobre
 * una `SUBSCRIPTION`, D-150): es la prueba de que se pagó y siempre va por correo.
 */
function needsEmail(notification: Notification, hasDevices: boolean): boolean {
  if (
    notification.severity === 'ALERT' ||
    (notification.severity === 'SUCCESS' &&
      notification.relatedEntityType === 'SUBSCRIPTION')
  ) {
    return true;
  }
  return notification.severity === 'WARNING' && !hasDevices;
}

/**
 * Entrega una notificación ya guardada por los canales de quien la recibe: correo y push (D-94,
 * D-95). El push va siempre; el correo solo según `needsEmail`. Si `auth` dice que la cuenta no existe o está desactivada, no sale nada. El correo solo
 * sale si la persona lo verificó, y el push, a cada dispositivo que tenga registrado.
 *
 * @remarks
 * Nunca falla. Quien la crea (`CreateNotificationUseCase`) ya guardó la notificación en el feed
 * antes de llamar aquí, y un canal caído no debe tumbar la acción que la originó: el cuadre o la
 * asignación ya quedaron guardados, y un error en este paso llegaría al cliente como un 500 que
 * no dice la verdad. La falla se escribe en el log con el id de la notificación, sin el correo
 * ni el texto ni los tokens.
 */
@Injectable()
export class DeliverNotificationUseCase {
  private readonly logger = new Logger(DeliverNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_RECIPIENT_READER)
    private readonly recipients: NotificationRecipientReader,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(PUSH_TOKEN_REPOSITORY)
    private readonly pushTokens: PushTokenRepository,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
  ) {}

  /** @param notification - La notificación recién guardada. */
  async execute(notification: Notification): Promise<void> {
    try {
      const recipient = await this.recipients.findRecipient(
        notification.recipientUserId,
      );
      if (recipient === null) {
        return;
      }
      const hasDevices = await this.sendPush(notification);
      if (needsEmail(notification, hasDevices)) {
        this.sendEmail(recipient, notification);
      }
    } catch (error) {
      this.logger.error(
        `No se pudo entregar la notificación ${notification.id}: ${String(error)}.`,
      );
    }
  }

  /**
   * @param recipient - Lo que se le puede mandar a la persona.
   * @param notification - La notificación.
   */
  private sendEmail(
    recipient: NotificationRecipient,
    notification: Notification,
  ): void {
    if (recipient.verifiedEmail === null) {
      return;
    }
    this.emailSender.send({
      to: recipient.verifiedEmail,
      ...notificationEmail(notification.title, notification.body),
    });
  }

  /**
   * @param notification - La notificación; se manda a cada dispositivo de su destinatario.
   * @returns Si la persona tiene al menos un dispositivo registrado.
   */
  private async sendPush(notification: Notification): Promise<boolean> {
    const tokens = await this.pushTokens.listByUser(
      notification.recipientUserId,
    );
    if (tokens.length === 0) {
      return false;
    }
    this.pushSender.send(
      tokens.map((token) => pushMessageFor(token.token, notification)),
    );
    return true;
  }
}
