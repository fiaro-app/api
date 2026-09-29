import { Module } from '@nestjs/common';
import { ApiErrorsModule } from '@/shared/infrastructure/filters/api-errors.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';
import {
  authExports,
  authProviders,
} from '@/modules/auth/infrastructure/auth.providers.js';
import { AccountController } from '@/modules/auth/infrastructure/controllers/account.controller.js';
import { AuthController } from '@/modules/auth/infrastructure/controllers/auth.controller.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';

/**
 * Autenticación con celular y contraseña (better-auth). Publica `/auth/*` (`AuthController`,
 * `@Public()`) y `/account/*` (`AccountController`, exige sesión), y ofrece a los demás módulos
 * el caso de uso para crear personas y el resolvedor de sesión que usa el guard global. El
 * dominio no conoce better-auth: solo este módulo lo usa.
 */
@Module({
  imports: [PersistenceModule, ApiErrorsModule, NotificationsModule],
  controllers: [AuthController, AccountController],
  providers: authProviders,
  exports: authExports,
})
export class AuthModule {}
