import type { PushMessage } from '@/modules/notifications/domain/push-message.js';

/**
 * Manda notificaciones push sin que quien las pide espere ni dependa de que salgan bien (D-95).
 *
 * @remarks
 * Igual que el correo (`EmailSender`), `send` no es `async` a propósito: no se puede hacer `await`
 * por error y frenar la acción que originó la notificación. Cada adaptador maneja sus propias
 * fallas y, cuando Expo dice que un dispositivo ya no existe, quita ese token del registro.
 */
export interface PushSender {
  /**
   * @param messages - Los mensajes a enviar, cada uno a un dispositivo.
   */
  send(messages: readonly PushMessage[]): void;
}
