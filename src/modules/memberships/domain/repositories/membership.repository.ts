import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

/** Puerto de persistencia de las membresías. */
export interface MembershipRepository {
  /** @param membership - Membresía nueva. */
  create(membership: Membership): Promise<void>;

  /**
   * @param id - Identificador de la membresía.
   * @returns La membresía, o `null` si no existe.
   */
  findById(id: string): Promise<Membership | null>;

  /**
   * @param userId - La persona.
   * @returns Sus membresías `ACTIVE`, de la más antigua a la más nueva.
   */
  findActiveByUserId(userId: string): Promise<readonly Membership[]>;
}
