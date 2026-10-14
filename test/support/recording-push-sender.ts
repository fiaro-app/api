import type { PushSender } from '@/modules/notifications/application/ports/push-sender.port.js';
import type { PushMessage } from '@/modules/notifications/domain/push-message.js';

/**
 * Guarda los push en memoria en vez de mandarlos: cada prueba lee `sent` para comprobar a qué
 * dispositivo llegó cada aviso y con qué título. Lo usa `startTestApp` en lugar del adaptador real.
 */
export class RecordingPushSender implements PushSender {
  /** Los mensajes que se habrían enviado, en el orden en que se pidieron. */
  readonly sent: PushMessage[] = [];

  /** @param messages - Los mensajes que se habrían enviado. */
  send(messages: readonly PushMessage[]): void {
    this.sent.push(...messages);
  }
}
