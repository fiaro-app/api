import { describe, expect, it } from 'vitest';
import type { Env } from '@/config/env.js';
import { createEmailSender } from '@/modules/notifications/infrastructure/email-sender.factory.js';
import { LoggingEmailSender } from '@/modules/notifications/infrastructure/logging-email-sender.js';
import { MailpitEmailSender } from '@/modules/notifications/infrastructure/mailpit-email-sender.js';
import { ResendEmailSender } from '@/modules/notifications/infrastructure/resend-email-sender.js';

const RESEND = {
  resendApiKey: 're_123',
  fromAddress: 'Fiaro <no-reply@fiaro.example>',
};

const envOf = (
  nodeEnv: Env['nodeEnv'],
  email: Partial<Env['email']>,
): Pick<Env, 'email' | 'nodeEnv'> => ({
  nodeEnv,
  email: {
    resendApiKey: undefined,
    fromAddress: undefined,
    mailpitUrl: undefined,
    ...email,
  },
});

describe('createEmailSender', () => {
  it('fuera de producción manda a Mailpit aunque haya API key de Resend', () => {
    const sender = createEmailSender(
      envOf('development', { ...RESEND, mailpitUrl: 'http://mailpit:8025' }),
    );

    expect(sender).toBeInstanceOf(MailpitEmailSender);
  });

  it('con RESEND_FROM_EMAIL vacío, Mailpit usa el remitente por defecto', () => {
    const sender = createEmailSender(
      envOf('development', {
        fromAddress: '',
        mailpitUrl: 'http://mailpit:8025',
      }),
    );

    expect(sender).toMatchObject({ fromAddress: 'Fiaro <no-reply@fiaro.dev>' });
  });

  it('fuera de producción y sin Mailpit, solo registra los correos en el log', () => {
    expect(createEmailSender(envOf('development', RESEND))).toBeInstanceOf(
      LoggingEmailSender,
    );
  });

  it('en producción, con la API key y el remitente, envía con Resend', () => {
    const sender = createEmailSender(
      envOf('production', { ...RESEND, mailpitUrl: 'http://mailpit:8025' }),
    );

    expect(sender).toBeInstanceOf(ResendEmailSender);
  });

  it('en producción sin remitente registra los correos en el log', () => {
    expect(
      createEmailSender(envOf('production', { resendApiKey: 're_123' })),
    ).toBeInstanceOf(LoggingEmailSender);
  });
});
