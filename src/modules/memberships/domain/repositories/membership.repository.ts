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
}
