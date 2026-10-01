import { Module } from '@nestjs/common';
import { collectionsProviders } from '@/modules/collections/infrastructure/collections.providers.js';
import { CollectionAssignmentController } from '@/modules/collections/infrastructure/controllers/collection-assignment.controller.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Cobro en campo: quién cobra cada préstamo (`CollectionAssignment`, D-82) y, más adelante, las
 * visitas y los pagos. Publica `POST`/`GET /loans/:loanId/collection-assignments`, protegidas
 * por `LenderScopeGuard` — de ahí que importe `LoansModule` (`GetLoanUseCase`, para validar el
 * préstamo) y `MembershipsModule` (`GetMembershipUseCase`, para validar el cobrador).
 */
@Module({
  imports: [PersistenceModule, LoansModule, MembershipsModule],
  controllers: [CollectionAssignmentController],
  providers: collectionsProviders,
})
export class CollectionsModule {}
