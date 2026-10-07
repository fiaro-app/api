import type { Provider } from '@nestjs/common';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { DeliverNotificationUseCase } from '@/modules/notifications/application/use-cases/deliver-notification.use-case.js';
import { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications.use-case.js';
import { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read.use-case.js';
import { NOTIFICATION_REPOSITORY } from '@/modules/notifications/domain/tokens/notification-repository.token.js';
import { PrismaNotificationRepository } from '@/modules/notifications/infrastructure/persistence/prisma-notification.repository.js';

/** Qué implementa cada puerto del módulo. */
export const notificationsProviders: Provider[] = [
  { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
  DeliverNotificationUseCase,
  CreateNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
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
