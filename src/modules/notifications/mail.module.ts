import { Module } from '@nestjs/common';
import {
  mailExports,
  mailProviders,
} from '@/modules/notifications/infrastructure/mail.providers.js';

/**
 * Envío de correos (`EMAIL_SENDER`), en su propio módulo a propósito. `auth` lo usa para la
 * recuperación de la contraseña y la verificación del correo de contacto, y `NotificationsModule`
 * importa a `auth` para leer el correo de contacto de quien recibe una notificación (D-94): si
 * `auth` importara `NotificationsModule`, el ciclo de módulos de Nest no arrancaría. Por eso el
 * correo vive aquí, y no dentro de `NotificationsModule`.
 */
@Module({
  providers: mailProviders,
  exports: mailExports,
})
export class MailModule {}
