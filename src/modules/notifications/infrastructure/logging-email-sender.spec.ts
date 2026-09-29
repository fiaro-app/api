import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import { LoggingEmailSender } from '@/modules/notifications/infrastructure/logging-email-sender.js';

const message: EmailMessage = {
  to: 'ana@example.com',
  subject: 'Bienvenida',
  html: '<p>Hola Ana</p>',
  text: 'Hola Ana',
};

describe('LoggingEmailSender.send', () => {
  it('escribe en el log el destinatario, el asunto y el texto, sin enviar nada', () => {
    const log = vi.fn();
    const sender = new LoggingEmailSender({ log });

    sender.send(message);

    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(message.to),
    );
    expect(log.mock.calls[0]?.[0]).toContain(message.subject);
    expect(log.mock.calls[0]?.[0]).toContain(message.text);
  });

  it('nunca lanza, aunque se llame varias veces seguidas', () => {
    const sender = new LoggingEmailSender({ log: vi.fn() });

    expect(() => {
      sender.send(message);
      sender.send(message);
    }).not.toThrow();
  });

  it('sin logger explícito usa uno propio, sin fallar', () => {
    const sender = new LoggingEmailSender();

    expect(() => {
      sender.send(message);
    }).not.toThrow();
  });
});
