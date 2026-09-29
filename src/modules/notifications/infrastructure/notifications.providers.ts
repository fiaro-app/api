import type { Provider } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import { createEmailSender } from '@/modules/notifications/infrastructure/email-sender.factory.js';

/** Qué implementa cada puerto del módulo. */
export const notificationsProviders: Provider[] = [
  {
    provide: EMAIL_SENDER,
    inject: [ENV],
    useFactory: (env: Env): EmailSender => createEmailSender(env),
  },
];

/** Lo que el módulo ofrece a los demás: el envío de correos. */
export const notificationsExports = [EMAIL_SENDER];
