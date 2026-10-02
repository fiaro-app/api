import { Module } from '@nestjs/common';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { DailySettlementController } from '@/modules/settlements/infrastructure/controllers/daily-settlement.controller.js';
import { settlementsProviders } from '@/modules/settlements/infrastructure/settlements.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Cuadre diario de un cobrador: lo esperado contra lo cobrado, declarado por él mismo al cerrar,
 * con desglose por medio de pago (D-86). Publica `POST`/`GET`/`QUERY /daily-settlements` y
 * `POST /daily-settlements/:id/{approve,reject}`, todas con `LenderScopeGuard` — de ahí que
 * importe `MembershipsModule`, dueño de `LENDER_SCOPE_RESOLVER`.
 *
 * @remarks
 * No importa ningún otro módulo de negocio: a diferencia del saldo (D-84) o la corrección de
 * pagos (D-85), los montos del cuadre son los que declara el cobrador, no un cálculo contra sus
 * visitas o pagos del día (PRODUCT.md §5).
 */
@Module({
  imports: [PersistenceModule, MembershipsModule],
  controllers: [DailySettlementController],
  providers: settlementsProviders,
})
export class SettlementsModule {}
