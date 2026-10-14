import type { Role } from '@/modules/memberships/domain/entities/role.js';
import type { MembershipStatus } from '@/modules/memberships/domain/entities/membership.entity.js';

/** Los datos públicos de una membresía, tal como los describe `MembershipSchema`. */
export interface MembershipDetails {
  /** Identificador de la membresía (UUIDv7). */
  readonly id: string;
  /** La persona. */
  readonly userId: string;
  /** El prestamista con el que trabaja. */
  readonly lenderId: string;
  /** Sus roles. */
  readonly roles: readonly Role[];
  readonly status: MembershipStatus;
  /** Cartera del cobrador, o `null` si no tiene el rol. */
  readonly portfolioId: string | null;
  /** Cuándo se creó. */
  readonly createdAt: Date;
  /** Cuándo se desactivó, o `null` si sigue activa. */
  readonly deactivatedAt: Date | null;
}
