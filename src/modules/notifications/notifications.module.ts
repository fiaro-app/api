import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { MailModule } from '@/modules/notifications/mail.module.js';
import { NotificationController } from '@/modules/notifications/infrastructure/controllers/notification.controller.js';
import {
  notificationsExports,
  notificationsProviders,
} from '@/modules/notifications/infrastructure/notifications.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Notificaciones: el feed interno (`Notification`, D-87) y su entrega por correo a quien verificó
 * su correo de contacto (D-94). Publica `CreateNotificationUseCase` para que otros módulos avisen,
 * y reexporta `MailModule` (`EMAIL_SENDER`) para quienes mandan correos de cortesía.
 *
 * @remarks
 * `QUERY`/`POST /notifications` no llevan `LenderScopeGuard`: son siempre las propias
 * notificaciones de quien tiene la sesión (el guard global, `AuthGuard`, ya lo exige), sin
 * importar con qué prestamista opera — una persona que trabaja para varios recibe las de todos a
 * la vez. Este módulo no importa `MembershipsModule`, que sí importa a este
 * (`notifications.providers.ts` explica por qué `CreateNotificationUseCase` no resuelve
 * destinatarios). Sí importa `AuthModule`, para leer el correo de contacto de quien recibe: `auth`
 * no importa este módulo, por eso el correo vive en `MailModule` (`mail.module.ts`).
 */
@Module({
  imports: [PersistenceModule, AuthModule, MailModule],
  controllers: [NotificationController],
  providers: notificationsProviders,
  exports: [MailModule, ...notificationsExports],
})
export class NotificationsModule {}
