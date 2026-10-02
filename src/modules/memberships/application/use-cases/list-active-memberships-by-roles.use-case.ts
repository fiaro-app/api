import { Inject, Injectable } from '@nestjs/common';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Las membresías `ACTIVE` de un prestamista que tengan al menos uno de los roles pedidos. Lo usa
 * `notifications` (`NotifyLenderUseCase`) para encontrar a quién avisarle algo del negocio, sin
 * conocer el dominio de `memberships` directamente (regla de fronteras, ARCHITECTURE.md §3).
 */
@Injectable()
export class ListActiveMembershipsByRolesUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /**
   * @param lenderId - El prestamista.
   * @param roles - Trae las membresías con al menos uno de estos roles.
   */
  async execute(
    lenderId: string,
    roles: readonly Role[],
  ): Promise<readonly MembershipDetails[]> {
    const memberships = await this.memberships.findActiveByLenderAndRoles(
      lenderId,
      roles,
    );
    return memberships.map(toMembershipDetails);
  }
}
