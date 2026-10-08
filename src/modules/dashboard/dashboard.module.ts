import { Module } from '@nestjs/common';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { dashboardProviders } from '@/modules/dashboard/infrastructure/dashboard.providers.js';
import { LenderDashboardController } from '@/modules/dashboard/infrastructure/controllers/lender-dashboard.controller.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { SettlementsModule } from '@/modules/settlements/settlements.module.js';

/**
 * Las vistas agregadas del Lender sobre todo su negocio (PROTOTIPO-FLUJOS.md §4.6/§4.9): el
 * resumen (D-99) y las estadísticas de cartera y mora (D-100). Publica `GET /lenders/me/dashboard`
 * y `QUERY /lenders/me/stats`. No tiene dominio ni persistencia propios: compone casos de uso ya
 * exportados por `collections` (saldo, resumen/estadísticas de un cobrador, historial de
 * asignaciones), `loans` (préstamos activos), `memberships` (membresías `COLLECTOR`), `clients`
 * (nombre de un cliente, para el ranking de mora) y `settlements` (cuadres `PENDING`).
 *
 * @remarks
 * No importa `NotificationsModule`: las alertas del resumen son de lectura, no generan un aviso
 * nuevo del sistema.
 */
@Module({
  imports: [
    ClientsModule,
    CollectionsModule,
    LoansModule,
    MembershipsModule,
    SettlementsModule,
  ],
  controllers: [LenderDashboardController],
  providers: dashboardProviders,
})
export class DashboardModule {}
