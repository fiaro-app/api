import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';

/**
 * Manda correos sin que quien los pide espere ni dependa de que salgan bien.
 *
 * @remarks
 * Un correo nunca puede bloquear ni tumbar el flujo que lo dispara: `send` no es `async` a
 * propósito, para que sea imposible hacerle `await` por error. Cada adaptador maneja sus propias
 * fallas (tiempo de espera agotado, credenciales inválidas, proveedor caído) con su propio log.
 */
export interface EmailSender {
  /**
   * @param message - El correo a enviar.
   */
  send(message: EmailMessage): void;
}
