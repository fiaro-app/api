import { Module } from '@nestjs/common';
import { collectionsProviders } from '@/modules/collections/infrastructure/collections.providers.js';
import { CollectionAssignmentController } from '@/modules/collections/infrastructure/controllers/collection-assignment.controller.js';
import { CollectionVisitController } from '@/modules/collections/infrastructure/controllers/collection-visit.controller.js';
import { LoanBalanceController } from '@/modules/collections/infrastructure/controllers/loan-balance.controller.js';
import { PaymentReversalController } from '@/modules/collections/infrastructure/controllers/payment-reversal.controller.js';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Cobro en campo: quién cobra cada préstamo (`CollectionAssignment`, D-82), las visitas con sus
 * pagos (`CollectionVisit`/`Payment`, D-83), el saldo/mora de un préstamo (D-84) y la corrección
 * de pagos (`PaymentReversal`, D-85). Publica `POST`/`GET /loans/:loanId/collection-assignments`,
 * `POST`/`GET /loans/:loanId/collection-visits`, `GET /loans/:loanId/balance` y
 * `POST /payments/:id/reversals`, todas con `LenderScopeGuard` — de ahí que importe `LoansModule`
 * (`GetLoanUseCase` para validar el préstamo, `ReconcileLoanStatusUseCase` para cerrarlo o
 * reabrirlo), `MembershipsModule` (`GetMembershipUseCase`, para validar el cobrador al asignar) y
 * `LendersModule` (`GetLenderUseCase`, para los días sin cobro del prestamista que el saldo
 * necesita).
 */
@Module({
  imports: [PersistenceModule, LoansModule, MembershipsModule, LendersModule],
  controllers: [
    CollectionAssignmentController,
    CollectionVisitController,
    LoanBalanceController,
    PaymentReversalController,
  ],
  providers: collectionsProviders,
})
export class CollectionsModule {}
