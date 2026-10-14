import type { Provider } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { PushSender } from '@/modules/notifications/application/ports/push-sender.port.js';
import { PUSH_SENDER } from '@/modules/notifications/application/ports/push-sender.token.js';
import { CountUnreadNotificationsUseCase } from '@/modules/notifications/application/use-cases/count-unread-notifications.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { DeliverNotificationUseCase } from '@/modules/notifications/application/use-cases/deliver-notification.use-case.js';
import { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications.use-case.js';
import { MarkAllNotificationsReadUseCase } from '@/modules/notifications/application/use-cases/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read.use-case.js';
import { RegisterPushTokenUseCase } from '@/modules/notifications/application/use-cases/register-push-token.use-case.js';
import { RevokePushTokenUseCase } from '@/modules/notifications/application/use-cases/revoke-push-token.use-case.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';
import { PUSH_TOKEN_REPOSITORY } from '@/modules/notifications/domain/tokens/push-token-repository.token.js';
import { PrismaNotificationRepository } from '@/modules/notifications/infrastructure/persistence/prisma-notification.repository.js';
import { PrismaPushTokenRepository } from '@/modules/notifications/infrastructure/persistence/prisma-push-token.repository.js';
import { createPushSender } from '@/modules/notifications/infrastructure/push/push-sender.factory.js';

/** Qué implementa cada puerto del módulo. */
export const notificationsProviders: Provider[] = [
  { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
  { provide: PUSH_TOKEN_REPOSITORY, useClass: PrismaPushTokenRepository },
  {
    provide: PUSH_SENDER,
    inject: [ENV, PUSH_TOKEN_REPOSITORY],
    useFactory: (env: Env, pushTokens: PushTokenRepository): PushSender =>
      createPushSender(env, pushTokens),
  },
  DeliverNotificationUseCase,
  CreateNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
  CountUnreadNotificationsUseCase,
  RegisterPushTokenUseCase,
  RevokePushTokenUseCase,
];

/**
 * Lo que el módulo ofrece a los demás: crear una notificación (`CreateNotificationUseCase`, que
 * además la entrega por los canales de quien la recibe). Sin depender de `memberships`, a
 * propósito: `memberships` ya importa a este módulo (para el correo de bienvenida y la contraseña
 * temporal), y que este importara `memberships` de vuelta sería un ciclo. Por eso quien necesita
 * avisarle a una membresía o a un rol (`collections`, `settlements`) resuelve el destinatario con
 * lo que ya tiene de `memberships` y solo le pasa el `userId` a `CreateNotificationUseCase`.
 */
export const notificationsExports = [CreateNotificationUseCase];
