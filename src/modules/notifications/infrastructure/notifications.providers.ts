import type { Provider } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications.use-case.js';
import { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read.use-case.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';
import { createEmailSender } from '@/modules/notifications/infrastructure/email-sender.factory.js';
import { PrismaNotificationRepository } from '@/modules/notifications/infrastructure/persistence/prisma-notification.repository.js';

/** Qué implementa cada puerto del módulo. */
export const notificationsProviders: Provider[] = [
  {
    provide: EMAIL_SENDER,
    inject: [ENV],
    useFactory: (env: Env): EmailSender => createEmailSender(env),
  },
  { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
  CreateNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
];

/**
 * Lo que el módulo ofrece a los demás: el envío de correos y crear una notificación
 * (`CreateNotificationUseCase`). Sin depender de `memberships`, a propósito: `notifications` es
 * una hoja (como `lenders`), y `memberships` ya la importa a ella (para el correo de bienvenida y
 * la contraseña temporal) — que ella importara `memberships` de vuelta sería un ciclo de módulos.
 * Por eso quien necesita avisarle a una membresía o a un rol (`collections`, `settlements`)
 * resuelve el destinatario con lo que ya tiene de `memberships` y solo le pasa el `userId` a
 * `CreateNotificationUseCase`.
 */
export const notificationsExports = [EMAIL_SENDER, CreateNotificationUseCase];
