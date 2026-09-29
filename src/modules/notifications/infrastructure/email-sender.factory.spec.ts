import { describe, expect, it } from 'vitest';
import { createEmailSender } from '@/modules/notifications/infrastructure/email-sender.factory.js';
import { LoggingEmailSender } from '@/modules/notifications/infrastructure/logging-email-sender.js';
import { ResendEmailSender } from '@/modules/notifications/infrastructure/resend-email-sender.js';

describe('createEmailSender', () => {
  it('sin RESEND_API_KEY registra los correos en el log en vez de enviarlos', () => {
    const sender = createEmailSender({
      email: { resendApiKey: undefined, fromAddress: undefined },
    });

    expect(sender).toBeInstanceOf(LoggingEmailSender);
  });

  it('con la API key pero sin remitente, también registra los correos en el log', () => {
    const sender = createEmailSender({
      email: { resendApiKey: 're_123', fromAddress: undefined },
    });

    expect(sender).toBeInstanceOf(LoggingEmailSender);
  });

  it('con la API key y el remitente, envía con Resend', () => {
    const sender = createEmailSender({
      email: {
        resendApiKey: 're_123',
        fromAddress: 'Fiaro <no-reply@fiaro.example>',
      },
    });

    expect(sender).toBeInstanceOf(ResendEmailSender);
  });
});
