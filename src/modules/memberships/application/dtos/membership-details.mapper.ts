import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import type { CreatedMembership } from '@/modules/memberships/application/dtos/create-membership.dto.js';
import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

/** @param membership - La membresía. */
export function toMembershipDetails(membership: Membership): MembershipDetails {
  return {
    id: membership.id,
    userId: membership.userId,
    lenderId: membership.lenderId,
    roles: membership.roles,
    status: membership.status,
    portfolioId: membership.portfolioId,
    createdAt: membership.createdAt,
    deactivatedAt: membership.deactivatedAt,
  };
}

/**
 * Una membresía recién creada (siempre `ACTIVE`, sin `deactivatedAt`) con la misma forma que
 * {@link MembershipDetails}, para que `InviteMembershipUseCase` pueda devolverla sin repetir
 * la escritura en la base de datos que ya hizo `CreateMembershipUseCase`.
 *
 * @param created - Lo que devolvió `CreateMembershipUseCase.execute`.
 */
export function toMembershipDetailsFromCreated(
  created: CreatedMembership,
): MembershipDetails {
  return { ...created, deactivatedAt: null };
}
