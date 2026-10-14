import { Module } from '@nestjs/common';
import {
  membershipsExports,
  membershipsProviders,
} from '@/modules/memberships/infrastructure/memberships.providers.js';
import { MembershipLifecycleController } from '@/modules/memberships/infrastructure/controllers/membership-lifecycle.controller.js';
import { MembershipController } from '@/modules/memberships/infrastructure/controllers/membership.controller.js';
import { OwnMembershipController } from '@/modules/memberships/infrastructure/controllers/own-membership.controller.js';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Membresías: la relación entre una persona y un prestamista, con sus roles. `CreateMembershipUseCase`
 * lo usa `tenants` (la del dueño, al registrar el negocio) y el seed de desarrollo. Publica
 * `POST /memberships`, `POST /memberships/:id/deactivate` y `PATCH /memberships/:id/roles`
 * (D-81), protegidas por `LenderScopeGuard` — de ahí que importe `AuthModule` (para
 * `GetUserByPhoneUseCase`/`CreateUserUseCase`, al invitar a una persona nueva) y
 * `NotificationsModule` (para el correo de cortesía con la contraseña temporal). Ofrece, por el
 * puerto `LENDER_SCOPE_RESOLVER`, con qué Lender opera una sesión (D-74) — cualquier módulo que
 * proteja una ruta con `LenderScopeGuard` debe importar este módulo.
 */
@Module({
  imports: [PersistenceModule, AuthModule, NotificationsModule],
  controllers: [
    OwnMembershipController,
    MembershipController,
    MembershipLifecycleController,
  ],
  providers: membershipsProviders,
  exports: membershipsExports,
})
export class MembershipsModule {}
