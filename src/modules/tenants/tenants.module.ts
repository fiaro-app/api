import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { SubscriptionsModule } from '@/modules/subscriptions/subscriptions.module.js';
import { RegistrationController } from '@/modules/tenants/infrastructure/controllers/registration.controller.js';
import {
  tenantsExports,
  tenantsProviders,
} from '@/modules/tenants/infrastructure/tenants.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Tenants. Publica `POST /register` (D-78): el registro público de un negocio, antes solo
 * alcanzable por el seed de desarrollo. Importa `LendersModule` porque crear un Tenant siempre
 * crea su primer prestamista, `MembershipsModule` porque quien lo registra recibe la membresía
 * de dueño (D-73), y `AuthModule` porque registrarse también da de alta a la persona
 * (`CreateUserUseCase`, D-78) y `SubscriptionsModule` porque todo Tenant nace con su
 * suscripción de prueba (D-115).
 */
@Module({
  imports: [
    PersistenceModule,
    LendersModule,
    MembershipsModule,
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [RegistrationController],
  providers: tenantsProviders,
  exports: tenantsExports,
})
export class TenantsModule {}
