import { Module } from '@nestjs/common';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';
import { alertsProviders } from '@/modules/alerts/infrastructure/alerts.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Alertas diarias para el prestamista (D-96): el aviso de mora de las 08:00 de Bogotá. No publica
 * rutas: es un proceso que corre dentro de la aplicación.
 *
 * @remarks
 * Compone, por la capa de aplicación, los casos de uso de otros módulos que ya exponen lo que
 * necesita: los préstamos activos (`loans`), el saldo de cada uno (`collections`, D-84), quién
 * administra cada prestamista (`memberships`) y el aviso en sí (`notifications`). Nadie importa
 * este módulo, así que no crea ciclos.
 */
@Module({
  imports: [
    PersistenceModule,
    LoansModule,
    CollectionsModule,
    MembershipsModule,
    NotificationsModule,
  ],
  providers: alertsProviders,
})
export class AlertsModule {}
