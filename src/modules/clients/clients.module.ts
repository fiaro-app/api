import { Module } from '@nestjs/common';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';
import {
  clientsExports,
  clientsProviders,
} from '@/modules/clients/infrastructure/clients.providers.js';
import { ClientController } from '@/modules/clients/infrastructure/controllers/client.controller.js';

/**
 * Clientes (personas deudoras, PRODUCT.md §5). Importa `MembershipsModule` para que
 * `LENDER_SCOPE_RESOLVER` esté disponible: sus rutas usan `LenderScopeGuard` (ARCHITECTURE.md
 * §6, mismo patrón que `lenders`, D-74).
 */
@Module({
  imports: [PersistenceModule, MembershipsModule],
  controllers: [ClientController],
  providers: clientsProviders,
  exports: clientsExports,
})
export class ClientsModule {}
