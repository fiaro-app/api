import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

/** Puerto de persistencia de las membresías. */
export interface MembershipRepository {
  /**
   * @param membership - Membresía nueva.
   * @throws {@link MembershipAlreadyExistsError} Si esa persona ya tiene una membresía con este
   * prestamista.
   */
  create(membership: Membership): Promise<void>;

  /**
   * @param id - Identificador de la membresía.
   * @param lenderId - El prestamista dueño.
   * @returns La membresía, o `null` si no existe o es de otro prestamista.
   */
  findById(id: string, lenderId: string): Promise<Membership | null>;

  /**
   * @param userId - La persona.
   * @returns Sus membresías `ACTIVE`, de la más antigua a la más nueva.
   */
  findActiveByUserId(userId: string): Promise<readonly Membership[]>;

  /** @param membership - La membresía con sus datos ya actualizados. */
  update(membership: Membership): Promise<void>;
}
