import { Logger } from '@nestjs/common';
import { z } from 'zod';
import type { PushSender } from '@/modules/notifications/application/ports/push-sender.port.js';
import type { PushMessage } from '@/modules/notifications/domain/push-message.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';

/** Adonde manda Expo los mensajes (D-95; API Push de Expo, sin SDK: una petición HTTP). */
const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo rechaza una petición con más de 100 mensajes (`PUSH_TOO_MANY_NOTIFICATIONS`). */
const MAX_MESSAGES_PER_REQUEST = 100;

/** Cuánto se espera a Expo antes de dar el lote por no enviado. */
const SEND_TIMEOUT_MS = 10_000;

/**
 * Cuántas peticiones pueden esperar a Expo a la vez. Pasado el límite, los lotes nuevos se
 * descartan y se registran: si Expo no responde, no se acumula memoria sin fin (como con el
 * correo).
 */
const MAX_PENDING_REQUESTS = 20;

/** El error de un boleto que significa que el dispositivo ya no existe: dejar de mandarle push. */
const DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';

/** Un boleto de Expo: uno por mensaje, en el mismo orden en que se mandaron. */
const TicketSchema = z.object({
  status: z.enum(['ok', 'error']),
  details: z.object({ error: z.string().optional() }).optional(),
});

/** La respuesta de Expo a una petición de envío. */
const TicketsResponseSchema = z.object({ data: z.array(TicketSchema) });

type Ticket = z.infer<typeof TicketSchema>;

/** Lo que el adaptador necesita para hablar con Expo. */
export interface ExpoPushSenderOptions {
  /** Token de acceso de Expo, si la cuenta tiene activada la seguridad mejorada. */
  readonly accessToken?: string | undefined;
  /** El registro de tokens: a un token que Expo ya no reconoce se le quita de aquí. */
  readonly invalidTokens: Pick<PushTokenRepository, 'deleteByToken'>;
  /** Cliente HTTP; por defecto, el `fetch` global. Las pruebas pasan uno falso. */
  readonly fetch?: typeof fetch | undefined;
}

/**
 * Manda push con la API de Expo, que entrega a Android (por FCM) y a iOS (por APNs) sin que el
 * backend hable con esos servicios.
 *
 * @remarks
 * Cumple el contrato del puerto: `send` no espera ni falla. Parte los mensajes en lotes de 100 y
 * cada lote tiene su propio límite de tiempo. Un boleto con `DeviceNotRegistered` quita ese token
 * del registro (`invalidTokens.deleteByToken`). Los demás errores se registran sin el token, y ningún error se
 * reporta a quien pidió el envío. Un `ok` solo quiere decir que Expo lo recibió, no que llegó al
 * celular: la confirmación de entrega (los recibos de Expo) no se consulta todavía.
 */
export class ExpoPushSender implements PushSender {
  private pending = 0;
  private readonly fetchImpl: typeof fetch;

  /**
   * @param options - Token de acceso opcional, qué hacer con tokens inválidos y el cliente HTTP.
   * @param logger - Dónde se escriben las fallas.
   */
  constructor(
    private readonly options: ExpoPushSenderOptions,
    private readonly logger: Pick<Logger, 'error' | 'warn'> = new Logger(
      'ExpoPushSender',
    ),
  ) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  /** @param messages - Los mensajes a enviar, cada uno a un dispositivo. */
  send(messages: readonly PushMessage[]): void {
    for (
      let start = 0;
      start < messages.length;
      start += MAX_MESSAGES_PER_REQUEST
    ) {
      const batch = messages.slice(start, start + MAX_MESSAGES_PER_REQUEST);
      if (this.pending >= MAX_PENDING_REQUESTS) {
        this.logger.error(
          `Expo no responde y hay ${String(MAX_PENDING_REQUESTS)} lotes esperando: se descartan ${String(batch.length)} push.`,
        );
        continue;
      }
      this.pending += 1;
      void this.deliver(batch)
        .catch((error: unknown) => {
          this.logger.error(
            `No se pudo enviar un lote de ${String(batch.length)} push a Expo: ${String(error)}.`,
          );
        })
        .finally(() => {
          this.pending -= 1;
        });
    }
  }

  /** @param batch - Hasta 100 mensajes, en una sola petición. */
  private async deliver(batch: readonly PushMessage[]): Promise<void> {
    const response = await this.fetchImpl(EXPO_SEND_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(batch.map(toExpoMessage)),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Expo respondió ${String(response.status)}`);
    }
    const { data } = TicketsResponseSchema.parse(await response.json());
    await Promise.all(
      batch.map((message, index) => this.handleTicket(message, data[index])),
    );
  }

  /**
   * @param message - El mensaje al que corresponde el boleto.
   * @param ticket - El boleto de Expo, o `undefined` si Expo devolvió menos boletos que mensajes.
   */
  private async handleTicket(
    message: PushMessage,
    ticket: Ticket | undefined,
  ): Promise<void> {
    if (ticket === undefined) {
      this.logger.error(
        `Expo no devolvió boleto para la notificación ${message.data.notificationId}.`,
      );
      return;
    }
    if (ticket.status === 'ok') {
      return;
    }
    if (ticket.details?.error === DEVICE_NOT_REGISTERED) {
      await this.options.invalidTokens.deleteByToken(message.to);
      return;
    }
    this.logger.warn(
      `Expo rechazó el push de la notificación ${message.data.notificationId}: ${ticket.details?.error ?? 'error desconocido'}.`,
    );
  }

  /** Las cabeceras de cada petición: la del token de acceso solo si está configurado. */
  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
    };
    if (this.options.accessToken !== undefined) {
      headers.authorization = `Bearer ${this.options.accessToken}`;
    }
    return headers;
  }
}

/**
 * Traduce un mensaje del dominio al formato de Expo.
 *
 * @param message - El mensaje del dominio.
 */
function toExpoMessage(message: PushMessage): Record<string, unknown> {
  return {
    to: message.to,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: 'default',
  };
}
