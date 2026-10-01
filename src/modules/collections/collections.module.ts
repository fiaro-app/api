import { Module } from '@nestjs/common';
import { collectionsProviders } from '@/modules/collections/infrastructure/collections.providers.js';
import { CollectionAssignmentController } from '@/modules/collections/infrastructure/controllers/collection-assignment.controller.js';
import { CollectionVisitController } from '@/modules/collections/infrastructure/controllers/collection-visit.controller.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Cobro en campo: quién cobra cada préstamo (`CollectionAssignment`, D-82) y las visitas con sus
 * pagos (`CollectionVisit`/`Payment`, D-83). Publica `POST`/`GET /loans/:loanId/collection-assignments`
 * y `POST`/`GET /loans/:loanId/collection-visits`, todas con `LenderScopeGuard` — de ahí que
 * importe `LoansModule` (`GetLoanUseCase`, para validar el préstamo) y `MembershipsModule`
 * (`GetMembershipUseCase`, para validar el cobrador al asignar).
 */
@Module({
  imports: [PersistenceModule, LoansModule, MembershipsModule],
  controllers: [CollectionAssignmentController, CollectionVisitController],
  providers: collectionsProviders,
})
export class CollectionsModule {}
