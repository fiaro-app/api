import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';
import {
  loansExports,
  loansProviders,
} from '@/modules/loans/infrastructure/loans.providers.js';
import { LoanController } from '@/modules/loans/infrastructure/controllers/loan.controller.js';

/**
 * Préstamos (PRODUCT.md §5). Importa `ClientsModule` para validar, al dar de alta, que el
 * cliente exista y sea del prestamista de la sesión (`GetClientUseCase`, composición por la capa
 * de aplicación, ARCHITECTURE.md §3) y `MembershipsModule` para que `LENDER_SCOPE_RESOLVER` esté
 * disponible: sus rutas usan `LenderScopeGuard`, mismo patrón que `clients` (D-76).
 */
@Module({
  imports: [PersistenceModule, ClientsModule, MembershipsModule],
  controllers: [LoanController],
  providers: loansProviders,
  exports: loansExports,
})
export class LoansModule {}
