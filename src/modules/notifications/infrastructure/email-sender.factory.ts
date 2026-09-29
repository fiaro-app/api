import { Resend } from 'resend';
import type { Env } from '@/config/env.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { LoggingEmailSender } from '@/modules/notifications/infrastructure/logging-email-sender.js';
import { ResendEmailSender } from '@/modules/notifications/infrastructure/resend-email-sender.js';

/**
 * Elige cómo se envían los correos: con Resend si hay API key y remitente configurados, y si no,
 * con un envío que solo los registra en el log (desarrollo, sin cuenta de Resend ni dominio
 * verificado).
 *
 * @param env - Configuración validada: la API key y el remitente de Resend.
 */
export function createEmailSender(env: Pick<Env, 'email'>): EmailSender {
  const { resendApiKey, fromAddress } = env.email;
  if (resendApiKey === undefined || fromAddress === undefined) {
    return new LoggingEmailSender();
  }
  return new ResendEmailSender(new Resend(resendApiKey), fromAddress);
}
