import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { MembershipModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

/** @param membership - Membresía nueva. */
export function toMembershipCreateInput(
  membership: Membership,
): Prisma.MembershipUncheckedCreateInput {
  return {
    id: membership.id,
    userId: membership.userId,
    lenderId: membership.lenderId,
    roles: [...membership.roles],
    status: membership.status,
    portfolioId: membership.portfolioId,
    createdAt: membership.createdAt,
    deactivatedAt: membership.deactivatedAt,
  };
}

/** @param row - Fila de `memberships`. */
export function toMembership(row: MembershipModel): Membership {
  return Membership.create({
    id: row.id,
    userId: row.userId,
    lenderId: row.lenderId,
    roles: row.roles,
    status: row.status,
    portfolioId: row.portfolioId,
    createdAt: row.createdAt,
    deactivatedAt: row.deactivatedAt,
  });
}
