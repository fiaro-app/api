import { Injectable } from '@nestjs/common';
import type {
  CollectorPeriodStats,
  GetCollectorStatsInput,
} from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import { CollectorNotFoundError } from '@/modules/collections/domain/errors/collector-not-found.error.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';

/**
 * El desempeño de un cobrador visto por quien administra el negocio: la misma cifra que el
 * cobrador ve de sí mismo en `QUERY /collectors/me/stats` (D-98) y que el Lender ve en el ranking
 * de `QUERY /lenders/me/stats` (D-100), pero de un cobrador puntual. Solo `OWNER` o `LENDER`, lo
 * comprueba el controller.
 *
 * @remarks
 * No recalcula nada: valida que la membresía sea de un cobrador del prestamista y delega en
 * {@link GetCollectorStatsUseCase}, para que las tres vistas nunca discrepen. Un cobrador dado de
 * baja también se puede consultar: su historial sigue siendo parte del negocio.
 */
@Injectable()
export class GetManagedCollectorStatsUseCase {
  constructor(
    private readonly getMembership: GetMembershipUseCase,
    private readonly getCollectorStats: GetCollectorStatsUseCase,
  ) {}

  /**
   * @param input - El cobrador a consultar, el prestamista y el rango (el mes actual, si no llega).
   * @returns Sus métricas del período.
   * @throws {@link MembershipNotFoundError} Si la membresía no existe, o es de otro prestamista.
   * @throws {@link CollectorNotFoundError} Si la membresía existe pero no tiene el rol `COLLECTOR`.
   */
  async execute(input: GetCollectorStatsInput): Promise<CollectorPeriodStats> {
    const membership = await this.getMembership.execute(
      input.collectorMembershipId,
      input.lenderId,
    );
    if (!membership.roles.includes('COLLECTOR')) {
      throw new CollectorNotFoundError(input.collectorMembershipId);
    }
    return await this.getCollectorStats.execute(input);
  }
}
