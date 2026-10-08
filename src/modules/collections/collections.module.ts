import { Module } from '@nestjs/common';
import {
  collectionsExports,
  collectionsProviders,
} from '@/modules/collections/infrastructure/collections.providers.js';
import { CollectionAssignmentController } from '@/modules/collections/infrastructure/controllers/collection-assignment.controller.js';
import { CollectionVisitController } from '@/modules/collections/infrastructure/controllers/collection-visit.controller.js';
import { CollectorRouteController } from '@/modules/collections/infrastructure/controllers/collector-route.controller.js';
import { CollectorStatsController } from '@/modules/collections/infrastructure/controllers/collector-stats.controller.js';
import { CollectorController } from '@/modules/collections/infrastructure/controllers/collector.controller.js';
import { LoanBalanceController } from '@/modules/collections/infrastructure/controllers/loan-balance.controller.js';
import { PaymentReversalController } from '@/modules/collections/infrastructure/controllers/payment-reversal.controller.js';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Cobro en campo: quién cobra cada préstamo (`CollectionAssignment`, D-82), las visitas con sus
 * pagos (`CollectionVisit`/`Payment`, D-83), el saldo/mora de un préstamo (D-84), la corrección de
 * pagos (`PaymentReversal`, D-85), la ruta del día de un cobrador (D-88), su baja con reasignación
 * de préstamos (D-97) y su resumen del día y estadísticas personales (D-98). Publica
 * `POST`/`GET /loans/:loanId/collection-assignments`, `POST`/`GET /loans/:loanId/collection-visits`,
 * `GET /loans/:loanId/balance`, `POST /payments/:id/reversals`, `QUERY /collectors/me/route`,
 * `POST /collectors/:id/deactivate`, `QUERY /collectors/me/daily-summary` y
 * `QUERY /collectors/me/stats`, todas con `LenderScopeGuard` — de ahí que importe `LoansModule`
 * (`GetLoanUseCase` para validar el préstamo, `ReconcileLoanStatusUseCase` para cerrarlo o
 * reabrirlo), `MembershipsModule` (`GetMembershipUseCase` para validar el cobrador al asignar o al
 * dar de baja, y `DeactivateMembershipUseCase` para la baja en sí, D-97), `LendersModule`
 * (`GetLenderUseCase`, para los días sin cobro del prestamista que el saldo y las estadísticas
 * necesitan), `NotificationsModule` (`CreateNotificationUseCase`, para avisarle a un cobrador que
 * tiene un préstamo nuevo, D-87) y `ClientsModule` (`GetClientUseCase`, para el nombre del cliente
 * en cada fila de la ruta, D-88).
 */
@Module({
  imports: [
    PersistenceModule,
    ClientsModule,
    LoansModule,
    MembershipsModule,
    LendersModule,
    NotificationsModule,
  ],
  controllers: [
    CollectionAssignmentController,
    CollectionVisitController,
    LoanBalanceController,
    PaymentReversalController,
    CollectorRouteController,
    CollectorController,
    CollectorStatsController,
  ],
  providers: collectionsProviders,
  exports: collectionsExports,
})
export class CollectionsModule {}
