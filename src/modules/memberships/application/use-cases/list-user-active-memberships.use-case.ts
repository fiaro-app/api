import { Inject, Injectable } from '@nestjs/common';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Las membresías `ACTIVE` de una persona, una por cada negocio en el que trabaja. Lo usa `dashboard`
 * (el consolidado de varios negocios, D-155) sin conocer el dominio de `memberships` (ARCHITECTURE.md §3).
 */
@Injectable()
export class ListUserActiveMembershipsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /** @param userId - La persona. */
  async execute(userId: string): Promise<readonly MembershipDetails[]> {
    return (await this.memberships.findActiveByUserId(userId)).map(
      toMembershipDetails,
    );
  }
}
