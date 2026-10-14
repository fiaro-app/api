import { Inject, Injectable } from '@nestjs/common';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import {
  CollectorSeats,
  occupiesCollectorSeat,
} from '@/modules/memberships/application/services/collector-seats.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';
import { LENDER_LOCK } from '@/shared/application/ports/lender-lock.token.js';

/**
 * Devuelve el acceso a un colaborador dado de baja, con los mismos roles y cartera que tenía. Su
 * historial nunca se borró, así que sigue igual. Si vuelve como cobrador ocupa un cupo del plan:
 * por eso corre con el candado del prestamista tomado. No le reasigna préstamos: eso se hace
 * aparte, como con cualquier cobrador.
 */
@Injectable()
export class ReactivateMembershipUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    private readonly collectorSeats: CollectorSeats,
    @Inject(LENDER_LOCK) private readonly lenderLock: LenderLock,
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, resuelto por `LenderScopeGuard`.
   * @returns La membresía activa (sin cambios si ya lo estaba).
   * @throws {@link MembershipNotFoundError} Si no existe o es de otro prestamista.
   * @throws {@link CollectorLimitReachedError} Si vuelve como cobrador y el plan no tiene cupo.
   */
  async execute(id: string, lenderId: string): Promise<MembershipDetails> {
    return this.lenderLock.runExclusive(lenderId, async () => {
      const current = await this.memberships.findById(id, lenderId);
      if (current === null) {
        throw new MembershipNotFoundError(id);
      }
      if (current.status === 'ACTIVE') {
        return toMembershipDetails(current);
      }
      if (occupiesCollectorSeat(current.roles)) {
        await this.collectorSeats.assertAvailable(lenderId);
      }
      const reactivated = Membership.create({
        id: current.id,
        userId: current.userId,
        lenderId: current.lenderId,
        roles: current.roles,
        status: 'ACTIVE',
        portfolioId: current.portfolioId,
        createdAt: current.createdAt,
        deactivatedAt: null,
      });
      await this.memberships.update(reactivated);
      return toMembershipDetails(reactivated);
    });
  }
}
