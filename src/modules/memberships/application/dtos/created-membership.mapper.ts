import type { CreatedMembership } from '@/modules/memberships/application/dtos/create-membership.dto.js';
import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

/** @param membership - La membresía recién creada. */
export function toCreatedMembership(membership: Membership): CreatedMembership {
  return {
    id: membership.id,
    userId: membership.userId,
    lenderId: membership.lenderId,
    roles: membership.roles,
    status: 'ACTIVE',
    portfolioId: membership.portfolioId,
    createdAt: membership.createdAt,
  };
}
