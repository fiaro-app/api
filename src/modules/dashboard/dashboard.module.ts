import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { dashboardProviders } from '@/modules/dashboard/infrastructure/dashboard.providers.js';
import { LenderStatsListsController } from '@/modules/dashboard/infrastructure/controllers/lender-stats-lists.controller.js';
import { LenderDashboardController } from '@/modules/dashboard/infrastructure/controllers/lender-dashboard.controller.js';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { SettlementsModule } from '@/modules/settlements/settlements.module.js';

/**
 * Las vistas agregadas del Lender sobre todo su negocio (PROTOTIPO-FLUJOS.md §4.6/§4.9): el
 * resumen (D-99), las estadísticas de cartera y mora (D-100) y su exportación a PDF (D-101).
 * Publica `GET /lenders/me/dashboard`, `QUERY /lenders/me/stats` y
 * `QUERY /lenders/me/stats/export`. No tiene dominio ni persistencia propios: compone casos de
 * uso ya exportados por `collections` (saldo, resumen/estadísticas de un cobrador, historial de
 * asignaciones), `loans` (préstamos activos), `memberships` (membresías `COLLECTOR`), `clients`
 * (nombre de un cliente, para el ranking de mora), `lenders` (nombre del prestamista, para el PDF)
 * y `settlements` (cuadres `PENDING`).
 *
 * @remarks
 * No importa `NotificationsModule`: las alertas del resumen son de lectura, no generan un aviso
 * nuevo del sistema.
 */
@Module({
  imports: [
    ClientsModule,
    CollectionsModule,
    LendersModule,
    LoansModule,
    MembershipsModule,
    SettlementsModule,
  ],
  controllers: [LenderDashboardController, LenderStatsListsController],
  providers: dashboardProviders,
})
export class DashboardModule {}
