import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PushMessage } from '@/modules/notifications/domain/push-message.js';
import { ExpoPushSender } from '@/modules/notifications/infrastructure/push/expo-push-sender.js';

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

function message(index: number): PushMessage {
  return {
    to: `ExponentPushToken[dispositivo-${String(index)}]`,
    title: 'Préstamo asignado',
    body: 'Te asignaron un préstamo para cobrar.',
    data: {
      notificationId: `notification-${String(index)}`,
      relatedEntityType: 'LOAN',
      relatedEntityId: 'loan-1',
    },
    priority: 'default',
    ttl: 43_200,
    channelId: 'default',
  };
}

/** Una respuesta de Expo con un boleto por cada elemento de `tickets`. */
function ticketsResponse(tickets: unknown[]): Response {
  return new Response(JSON.stringify({ data: tickets }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const OK_TICKET = { status: 'ok', id: 'ticket-1' };

/** Una petición que nunca responde: deja el lote esperando a Expo para siempre. */
const neverResponds = () => new Promise<Response>(() => undefined);

/** Lo que el adaptador le pidió a `fetch`, ya leído en texto para comprobarlo. */
interface FetchCall {
  readonly url: string;
  readonly method: string | undefined;
  readonly headers: unknown;
  readonly body: string;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function setup(
  respond: () => Promise<Response>,
  options: { accessToken?: string } = {},
) {
  const calls: FetchCall[] = [];
  const fakeFetch = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: urlOf(url),
      method: init?.method,
      headers: init?.headers,
      body: typeof init?.body === 'string' ? init.body : '',
    });
    return respond();
  });
  const deleteByToken = vi.fn<(token: string) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const logger = { error: vi.fn(), warn: vi.fn() };
  const sender = new ExpoPushSender(
    {
      accessToken: options.accessToken,
      invalidTokens: { deleteByToken },
      fetch: fakeFetch,
    },
    logger,
  );
  return { sender, calls, fakeFetch, deleteByToken, logger };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ExpoPushSender', () => {
  it('manda un lote en una petición POST con el formato que pide Expo', async () => {
    const { sender, calls } = setup(() =>
      Promise.resolve(ticketsResponse([OK_TICKET])),
    );

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    const [call] = calls;
    expect(call?.url).toBe(EXPO_URL);
    expect(call?.method).toBe('POST');
    expect(call?.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
    });
    expect(JSON.parse(call?.body ?? '')).toEqual([
      {
        to: 'ExponentPushToken[dispositivo-1]',
        title: 'Préstamo asignado',
        body: 'Te asignaron un préstamo para cobrar.',
        data: {
          notificationId: 'notification-1',
          relatedEntityType: 'LOAN',
          relatedEntityId: 'loan-1',
        },
        sound: 'default',
        priority: 'default',
        ttl: 43_200,
        channelId: 'default',
      },
    ]);
  });

  it('manda el token de acceso en la cabecera cuando está configurado', async () => {
    const { sender, calls } = setup(
      () => Promise.resolve(ticketsResponse([OK_TICKET])),
      { accessToken: 'secreto-de-prueba' },
    );

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(calls).toHaveLength(1);
    });
    expect(calls[0]?.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: 'Bearer secreto-de-prueba',
    });
  });

  it('parte más de 100 mensajes en lotes de 100', async () => {
    const { sender, calls } = setup(() =>
      Promise.resolve(ticketsResponse(Array(100).fill(OK_TICKET))),
    );
    const messages = Array.from({ length: 250 }, (_, index) => message(index));

    sender.send(messages);

    await vi.waitFor(() => {
      expect(calls).toHaveLength(3);
    });
    const sizes = calls.map(
      (call) => (JSON.parse(call.body) as unknown[]).length,
    );
    expect(sizes).toEqual([100, 100, 50]);
  });

  it('si Expo dice que el dispositivo ya no existe, quita ese token y no los demás', async () => {
    const { sender, deleteByToken, logger } = setup(() =>
      Promise.resolve(
        ticketsResponse([
          OK_TICKET,
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
        ]),
      ),
    );

    sender.send([message(1), message(2)]);

    await vi.waitFor(() => {
      expect(deleteByToken).toHaveBeenCalledTimes(1);
    });
    expect(deleteByToken).toHaveBeenCalledWith(
      'ExponentPushToken[dispositivo-2]',
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('otro error de boleto se registra sin quitar el token', async () => {
    const { sender, deleteByToken, logger } = setup(() =>
      Promise.resolve(
        ticketsResponse([
          { status: 'error', details: { error: 'MessageTooBig' } },
        ]),
      ),
    );

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(logger.warn).toHaveBeenCalledWith(
        'Expo rechazó el push de la notificación notification-1: MessageTooBig.',
      );
    });
    expect(deleteByToken).not.toHaveBeenCalled();
  });

  it('un boleto con error sin detalle se registra como error desconocido', async () => {
    const { sender, logger } = setup(() =>
      Promise.resolve(ticketsResponse([{ status: 'error' }])),
    );

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(logger.warn).toHaveBeenCalledWith(
        'Expo rechazó el push de la notificación notification-1: error desconocido.',
      );
    });
  });

  it('si Expo devuelve menos boletos que mensajes, lo registra por el que falta', async () => {
    const { sender, logger } = setup(() =>
      Promise.resolve(ticketsResponse([OK_TICKET])),
    );

    sender.send([message(1), message(2)]);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'Expo no devolvió boleto para la notificación notification-2.',
      );
    });
  });

  it('una respuesta HTTP de error se registra y no lanza', async () => {
    const { sender, logger } = setup(() =>
      Promise.resolve(new Response('demasiadas peticiones', { status: 429 })),
    );

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'No se pudo enviar un lote de 1 push a Expo: Error: Expo respondió 429.',
      );
    });
  });

  it('una falla de red se registra y no lanza', async () => {
    const { sender, logger } = setup(() =>
      Promise.reject(new Error('sin conexión')),
    );

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'No se pudo enviar un lote de 1 push a Expo: Error: sin conexión.',
      );
    });
  });

  it('una respuesta que no tiene la forma de Expo se registra', async () => {
    const { sender, logger } = setup(() =>
      Promise.resolve(
        new Response(JSON.stringify({ nope: true }), { status: 200 }),
      ),
    );

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo enviar un lote de 1 push a Expo'),
      );
    });
  });

  it('descarta los lotes nuevos cuando ya hay 20 esperando a Expo', () => {
    const { sender, fakeFetch, logger } = setup(neverResponds);
    const messages = Array.from({ length: 2_100 }, (_, index) =>
      message(index),
    );

    sender.send(messages);

    expect(fakeFetch).toHaveBeenCalledTimes(20);
    expect(logger.error).toHaveBeenCalledWith(
      'Expo no responde y hay 20 lotes esperando: se descartan 100 push.',
    );
  });

  it('sin fetch inyectado, usa el de Node', async () => {
    const globalFetch = vi.fn(() =>
      Promise.resolve(ticketsResponse([OK_TICKET])),
    );
    vi.stubGlobal('fetch', globalFetch);
    const sender = new ExpoPushSender({
      invalidTokens: { deleteByToken: () => Promise.resolve() },
    });

    sender.send([message(1)]);

    await vi.waitFor(() => {
      expect(globalFetch).toHaveBeenCalledTimes(1);
    });
  });
});
