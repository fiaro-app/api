import { Module } from '@nestjs/common';
import {
  notificationsExports,
  notificationsProviders,
} from '@/modules/notifications/infrastructure/notifications.providers.js';

/**
 * Envío de correos, sin bloquear nunca a quien lo pide. Publica `EMAIL_SENDER` para que otros
 * módulos lo inyecten; con `RESEND_API_KEY` y `RESEND_FROM_EMAIL` configurados envía con Resend,
 * y si no, solo registra el correo en el log (desarrollo).
 */
@Module({
  providers: notificationsProviders,
  exports: notificationsExports,
})
export class NotificationsModule {}
