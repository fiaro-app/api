import { Inject, Injectable } from '@nestjs/common';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import { assertNotOwner } from '@/modules/memberships/application/services/assert-not-owner.js';
import {
  AdminSeats,
  occupiesAdminSeat,
} from '@/modules/memberships/application/services/admin-seats.js';
import {
  CollectorSeats,
  occupiesCollectorSeat,
} from '@/modules/memberships/application/services/collector-seats.js';
import { validateMembershipData } from '@/modules/memberships/application/services/membership-data.validator.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';
import { LENDER_LOCK } from '@/shared/application/ports/lender-lock.token.js';

/**
 * Cambia los roles de una membresía del prestamista de la sesión.
 *
 * @remarks
 * Si los roles nuevos incluyen `COLLECTOR`, usa la cartera que llegue en el pedido o, si no
 * llegó ninguna, la que la membresía ya tenía; sin ninguna de las dos, `InvalidMembershipDataError`
 * (la misma regla que al invitar, PRODUCT.md §5). Si los roles nuevos no incluyen `COLLECTOR`, la
 * cartera se limpia (`null`): ya no es cobrador, no tiene sentido que conserve una. El controller
 * (no este caso de uso) impide que una sesión se cambie los roles a sí misma.
 */
@Injectable()
export class ChangeMembershipRolesUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    private readonly collectorSeats: CollectorSeats,
    private readonly adminSeats: AdminSeats,
    @Inject(LENDER_LOCK) private readonly lenderLock: LenderLock,
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, resuelto por `LenderScopeGuard`.
   * @param roles - Los roles nuevos.
   * @param portfolioId - La cartera nueva, si trae una.
   * @returns La membresía con sus roles ya actualizados.
   * @throws {@link MembershipNotFoundError} Si no existe o es de otro prestamista.
   * @throws {@link InvalidMembershipDataError} Si los roles o la cartera no cumplen la regla, o
   * si es la membresía del dueño.
   * @throws {@link CollectorLimitReachedError} Si una membresía activa pasa a ocupar un cupo de
   * cobrador y el plan no tiene cupo.
   * @throws {@link AdminLimitReachedError} Si una membresía activa pasa a ser administradora y el
   * plan no tiene cupo.
   */
  async execute(
    id: string,
    lenderId: string,
    roles: readonly Role[],
    portfolioId?: string | null,
  ): Promise<MembershipDetails> {
    return this.lenderLock.runExclusive(lenderId, () =>
      this.change(id, lenderId, roles, portfolioId),
    );
  }

  /** El cambio en sí, con el candado del prestamista ya tomado. */
  private async change(
    id: string,
    lenderId: string,
    roles: readonly Role[],
    portfolioId?: string | null,
  ): Promise<MembershipDetails> {
    const current = await this.memberships.findById(id, lenderId);
    if (current === null) {
      throw new MembershipNotFoundError(id);
    }
    assertNotOwner(current.roles, 'cambiar los roles de');

    const data = validateMembershipData({
      roles,
      portfolioId: portfolioId ?? current.portfolioId,
    });

    if (
      current.status === 'ACTIVE' &&
      occupiesCollectorSeat(data.roles) &&
      !occupiesCollectorSeat(current.roles)
    ) {
      await this.collectorSeats.assertAvailable(lenderId);
    }
    if (
      current.status === 'ACTIVE' &&
      occupiesAdminSeat(data.roles) &&
      !occupiesAdminSeat(current.roles)
    ) {
      await this.adminSeats.assertAvailable(lenderId);
    }

    const changed = Membership.create({
      id: current.id,
      userId: current.userId,
      lenderId: current.lenderId,
      roles: data.roles,
      status: current.status,
      portfolioId: data.portfolioId,
      createdAt: current.createdAt,
      deactivatedAt: current.deactivatedAt,
    });
    await this.memberships.update(changed);
    return toMembershipDetails(changed);
  }
}
