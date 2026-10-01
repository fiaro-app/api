import { Inject, Injectable } from '@nestjs/common';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import { validateMembershipData } from '@/modules/memberships/application/services/membership-data.validator.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

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
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, resuelto por `LenderScopeGuard`.
   * @param roles - Los roles nuevos.
   * @param portfolioId - La cartera nueva, si trae una.
   * @returns La membresía con sus roles ya actualizados.
   * @throws {@link MembershipNotFoundError} Si no existe o es de otro prestamista.
   * @throws {@link InvalidMembershipDataError} Si los roles o la cartera no cumplen la regla.
   */
  async execute(
    id: string,
    lenderId: string,
    roles: readonly Role[],
    portfolioId?: string | null,
  ): Promise<MembershipDetails> {
    const current = await this.memberships.findById(id, lenderId);
    if (current === null) {
      throw new MembershipNotFoundError(id);
    }

    const data = validateMembershipData({
      roles,
      portfolioId: portfolioId ?? current.portfolioId,
    });

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
