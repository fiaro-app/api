import { Resend } from 'resend';
import type { Env } from '@/config/env.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { LoggingEmailSender } from '@/modules/notifications/infrastructure/logging-email-sender.js';
import {
  MAILPIT_DEFAULT_FROM,
  MailpitEmailSender,
} from '@/modules/notifications/infrastructure/mailpit-email-sender.js';
import { ResendEmailSender } from '@/modules/notifications/infrastructure/resend-email-sender.js';

/**
 * Elige cómo se envían los correos. Solo producción usa Resend; fuera de producción nunca se
 * manda un correo real, aunque `.env` tenga una API key de Resend: van a Mailpit (si hay
 * `MAILPIT_URL`) para revisar contenido y estilos, o solo al log.
 *
 * @param env - Configuración validada: entorno, Resend y Mailpit.
 */
export function createEmailSender(
  env: Pick<Env, 'email' | 'nodeEnv'>,
): EmailSender {
  const { resendApiKey, fromAddress, mailpitUrl } = env.email;
  if (env.nodeEnv !== 'production') {
    return mailpitUrl === undefined
      ? new LoggingEmailSender()
      : new MailpitEmailSender(
          mailpitUrl,
          fromAddress === undefined || fromAddress === ''
            ? MAILPIT_DEFAULT_FROM
            : fromAddress,
        );
  }
  if (resendApiKey === undefined || fromAddress === undefined) {
    return new LoggingEmailSender();
  }
  return new ResendEmailSender(new Resend(resendApiKey), fromAddress);
}
