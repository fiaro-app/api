import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import type { ResendClient } from '@/modules/notifications/infrastructure/resend-email-sender.js';
import { ResendEmailSender } from '@/modules/notifications/infrastructure/resend-email-sender.js';

const message: EmailMessage = {
  to: 'ana@example.com',
  subject: 'Bienvenida',
  html: '<p>Hola Ana</p>',
  text: 'Hola Ana',
};

/** Lo que devuelve `resend.emails.send`; una promesa que nunca se resuelve la tipa. */
type SendResult = Awaited<ReturnType<ResendClient['emails']['send']>>;
const neverResolves = () => new Promise<SendResult>(() => undefined);

function setup(
  send: ResendClient['emails']['send'] = vi.fn(() =>
    Promise.resolve({ data: { id: 'email-1' }, error: null }),
  ),
) {
  const logger = { error: vi.fn() };
  const resend: ResendClient = { emails: { send } };
  const sender = new ResendEmailSender(
    resend,
    'Fiaro <no-reply@fiaro.example>',
    logger,
  );
  return { sender, send, logger };
}

describe('ResendEmailSender.send', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('manda el correo al remitente configurado, sin esperar la respuesta', () => {
    const { sender, send } = setup();

    sender.send(message);

    expect(send).toHaveBeenCalledExactlyOnceWith({
      from: 'Fiaro <no-reply@fiaro.example>',
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  });

  it('no espera a Resend: entrega el correo y termina aunque Resend no responda', () => {
    const { sender, send } = setup(vi.fn(neverResolves));

    sender.send(message);

    expect(send).toHaveBeenCalledOnce();
  });

  it('nunca rechaza ni lanza hacia quien llama, aunque Resend falle', async () => {
    const { sender, logger } = setup(
      vi.fn(() => Promise.reject(new Error('fetch failed'))),
    );

    expect(() => {
      sender.send(message);
    }).not.toThrow();
    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledOnce();
    });
  });

  it('si Resend devuelve un error (sin lanzar), lo escribe en el log y sigue', async () => {
    const { sender, logger } = setup(
      vi.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Invalid `from` field.', name: 'validation_error' },
        }),
      ),
    );

    sender.send(message);
    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledOnce();
    });

    expect(logger.error).toHaveBeenCalledWith(
      `No se pudo enviar el correo a ${message.to}: Invalid \`from\` field..`,
    );
  });

  it('un error que no es un Error también queda en el log', async () => {
    const notAnError = 'texto' as unknown as Error;
    const { sender, logger } = setup(vi.fn(() => Promise.reject(notAnError)));

    sender.send(message);
    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledOnce();
    });

    expect(String(logger.error.mock.calls[0]?.[0])).toContain(
      'error desconocido',
    );
  });

  it('si Resend no responde a tiempo, da el correo por no enviado', async () => {
    vi.useFakeTimers();
    const { sender, logger } = setup(vi.fn(neverResolves));

    sender.send(message);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(String(logger.error.mock.calls[0]?.[0])).toContain(
      'sin respuesta en 10000 ms',
    );
  });

  it('con Resend sin responder, pasado el límite de pendientes descarta los correos en lugar de acumularlos', () => {
    const { sender, send, logger } = setup(vi.fn(neverResolves));

    for (let i = 0; i < 50; i++) {
      sender.send(message);
    }
    sender.send(message);

    expect(send).toHaveBeenCalledTimes(50);
    expect(logger.error).toHaveBeenCalledOnce();
    expect(String(logger.error.mock.calls[0]?.[0])).toContain('se descarta');
  });

  it('libera lugar a medida que Resend va respondiendo', async () => {
    const { sender, send } = setup();

    for (let i = 0; i < 60; i++) {
      sender.send(message);
      await Promise.resolve();
      await Promise.resolve();
    }

    expect(send).toHaveBeenCalledTimes(60);
  });

  it('sin logger explícito usa uno propio, sin fallar', () => {
    const send = vi.fn(() =>
      Promise.resolve({ data: { id: 'email-1' }, error: null }),
    );
    const sender = new ResendEmailSender(
      { emails: { send } },
      'Fiaro <no-reply@fiaro.example>',
    );

    expect(() => {
      sender.send(message);
    }).not.toThrow();
  });
});
