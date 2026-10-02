import { Module } from '@nestjs/common';
import { NotificationController } from '@/modules/notifications/infrastructure/controllers/notification.controller.js';
import {
  notificationsExports,
  notificationsProviders,
} from '@/modules/notifications/infrastructure/notifications.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Envío de correos, sin bloquear nunca a quien lo pide, y el feed de notificaciones internas
 * (`Notification`, D-87). Publica `EMAIL_SENDER` y `CreateNotificationUseCase` para que otros
 * módulos los inyecten; con `RESEND_API_KEY` y `RESEND_FROM_EMAIL` configurados envía correos con
 * Resend, y si no, solo registra el correo en el log (desarrollo).
 *
 * @remarks
 * `QUERY`/`POST /notifications` no llevan `LenderScopeGuard`: son siempre las propias
 * notificaciones de quien tiene la sesión (el guard global, `AuthGuard`, ya lo exige), sin
 * importar con qué prestamista opera — una persona que trabaja para varios recibe las de todos a
 * la vez. Por eso este módulo no importa `MembershipsModule`, que sí importa a este
 * (`notifications.providers.ts` explica por qué `CreateNotificationUseCase` no resuelve
 * destinatarios: quien lo llama ya tiene esa membresía resuelta).
 */
@Module({
  imports: [PersistenceModule],
  controllers: [NotificationController],
  providers: notificationsProviders,
  exports: notificationsExports,
})
export class NotificationsModule {}
