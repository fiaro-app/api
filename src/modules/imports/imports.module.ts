import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { ImportController } from '@/modules/imports/infrastructure/controllers/import.controller.js';
import { importsProviders } from '@/modules/imports/infrastructure/imports.providers.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Importar desde una hoja (D-152). Compone los casos de uso de clientes, préstamos y asignaciones
 * en vez de escribir en sus tablas, y `MembershipsModule` trae el `LENDER_SCOPE_RESOLVER` del guard.
 */
@Module({
  imports: [
    PersistenceModule,
    ClientsModule,
    LoansModule,
    CollectionsModule,
    MembershipsModule,
  ],
  controllers: [ImportController],
  providers: importsProviders,
})
export class ImportsModule {}
