import { Module } from '@nestjs/common';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';
import { DailySettlementController } from '@/modules/settlements/infrastructure/controllers/daily-settlement.controller.js';
import { settlementsProviders } from '@/modules/settlements/infrastructure/settlements.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Cuadre diario de un cobrador: lo esperado contra lo cobrado, declarado por él mismo al cerrar,
 * con desglose por medio de pago (D-86). Publica `POST`/`GET`/`QUERY /daily-settlements` y
 * `POST /daily-settlements/:id/{approve,reject}`, todas con `LenderScopeGuard` — de ahí que
 * importe `MembershipsModule`, dueño de `LENDER_SCOPE_RESOLVER` y, desde D-87, también
 * `ListActiveMembershipsByRolesUseCase`/`GetMembershipUseCase`, para avisarle a quien administra
 * el prestamista (al enviar) o al cobrador (al rechazar) — de ahí que también importe
 * `NotificationsModule`.
 *
 * @remarks
 * No compone `loans` ni `collections`: a diferencia del saldo (D-84) o la corrección de pagos
 * (D-85), los montos del cuadre son los que declara el cobrador, no un cálculo contra sus visitas
 * o pagos del día (PRODUCT.md §5).
 */
@Module({
  imports: [PersistenceModule, MembershipsModule, NotificationsModule],
  controllers: [DailySettlementController],
  providers: settlementsProviders,
})
export class SettlementsModule {}
