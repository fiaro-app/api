import { Module } from '@nestjs/common';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { dashboardProviders } from '@/modules/dashboard/infrastructure/dashboard.providers.js';
import { LenderDashboardController } from '@/modules/dashboard/infrastructure/controllers/lender-dashboard.controller.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { SettlementsModule } from '@/modules/settlements/settlements.module.js';

/**
 * El resumen del negocio del Lender (PROTOTIPO-FLUJOS.md §4.6, D-99): cartera, cobro de hoy,
 * cobradores, mora y alertas. Publica `GET /lenders/me/dashboard`. No tiene dominio ni
 * persistencia propios: compone casos de uso ya exportados por `collections` (saldo y resumen
 * diario de un cobrador), `loans` (préstamos activos), `memberships` (membresías `COLLECTOR`) y
 * `settlements` (cuadres `PENDING`).
 *
 * @remarks
 * No importa `NotificationsModule`: las alertas del resumen son de lectura, no generan un aviso
 * nuevo del sistema.
 */
@Module({
  imports: [
    CollectionsModule,
    LoansModule,
    MembershipsModule,
    SettlementsModule,
  ],
  controllers: [LenderDashboardController],
  providers: dashboardProviders,
})
export class DashboardModule {}
