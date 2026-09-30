import { Module } from '@nestjs/common';
import {
  membershipsExports,
  membershipsProviders,
} from '@/modules/memberships/infrastructure/memberships.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Membresías: la relación entre una persona y un prestamista, con sus roles. Todavía no publica
 * rutas: `CreateMembershipUseCase` lo usa `tenants` (la del dueño, al registrar el negocio) y el
 * seed de desarrollo.
 */
@Module({
  imports: [PersistenceModule],
  providers: membershipsProviders,
  exports: membershipsExports,
})
export class MembershipsModule {}
