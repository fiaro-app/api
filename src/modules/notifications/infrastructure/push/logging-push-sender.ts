import { Logger } from '@nestjs/common';
import type { PushSender } from '@/modules/notifications/application/ports/push-sender.port.js';
import type { PushMessage } from '@/modules/notifications/domain/push-message.js';

/**
 * Sustituto de desarrollo y de las pruebas: en vez de mandar el push, lo escribe en el log. Así el
 * resto de la aplicación funciona sin una cuenta de Expo ni un celular.
 *
 * @remarks
 * No escribe los tokens: son el identificador de un dispositivo, y el log se guarda (D-62).
 */
export class LoggingPushSender implements PushSender {
  /** @param logger - Dónde se escribe el push. */
  constructor(
    private readonly logger: Pick<Logger, 'log'> = new Logger(
      'LoggingPushSender',
    ),
  ) {}

  /** @param messages - Los push que se habrían enviado. */
  send(messages: readonly PushMessage[]): void {
    for (const message of messages) {
      this.logger.log(
        `Push (modo desarrollo, no se envía) para la notificación ${message.data.notificationId} — título: "${message.title}".`,
      );
    }
  }
}
