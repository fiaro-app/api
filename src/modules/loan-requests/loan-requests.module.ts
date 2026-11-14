import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';
import { LoanRequestController } from '@/modules/loan-requests/infrastructure/controllers/loan-request.controller.js';
import { loanRequestsProviders } from '@/modules/loan-requests/infrastructure/loan-requests.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Solicitudes de préstamo de los cobradores (PRODUCT.md §5). Compone, por la capa de
 * aplicación, `clients`, `loans`, `collections` (la asignación del cobrador), `memberships` (a
 * quién avisar y `LENDER_SCOPE_RESOLVER`) y `notifications` (el aviso y su push).
 */
@Module({
  imports: [
    PersistenceModule,
    ClientsModule,
    LoansModule,
    CollectionsModule,
    MembershipsModule,
    NotificationsModule,
  ],
  controllers: [LoanRequestController],
  providers: loanRequestsProviders,
})
export class LoanRequestsModule {}
