import { Module } from '@nestjs/common';
import {
  membershipsExports,
  membershipsProviders,
} from '@/modules/memberships/infrastructure/memberships.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Membresías: la relación entre una persona y un prestamista, con sus roles. Todavía no publica
 * rutas propias: `CreateMembershipUseCase` lo usa `tenants` (la del dueño, al registrar el
 * negocio) y el seed de desarrollo. Sí ofrece, por el puerto `LENDER_SCOPE_RESOLVER`, con qué
 * Lender opera una sesión (D-74) — cualquier módulo que proteja una ruta con
 * `LenderScopeGuard` debe importar este módulo.
 */
@Module({
  imports: [PersistenceModule],
  providers: membershipsProviders,
  exports: membershipsExports,
})
export class MembershipsModule {}
