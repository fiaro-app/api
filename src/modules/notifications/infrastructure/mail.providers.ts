import type { Provider } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import { createEmailSender } from '@/modules/notifications/infrastructure/email-sender.factory.js';

/** El adaptador de correo, elegido por la configuración: Resend, o solo el log en desarrollo. */
export const mailProviders: Provider[] = [
  {
    provide: EMAIL_SENDER,
    inject: [ENV],
    useFactory: (env: Env): EmailSender => createEmailSender(env),
  },
];

/** Lo que ofrece el módulo de correo: el puerto `EMAIL_SENDER`. */
export const mailExports = [EMAIL_SENDER];
