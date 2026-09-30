import type { Role } from '@/modules/memberships/domain/entities/role.js';

/** Datos con los que se da de alta a una membresía. */
export interface CreateMembershipInput {
  /** La persona. */
  readonly userId: string;
  /** El prestamista con el que trabaja. */
  readonly lenderId: string;
  /** Sin repetidos y con al menos un rol. */
  readonly roles: readonly Role[];
  /** Cartera del cobrador. Obligatoria si `roles` incluye `COLLECTOR`. */
  readonly portfolioId?: string | null;
}

/** La membresía creada: lo que el alta devuelve a quien la pidió. */
export interface CreatedMembership {
  /** Identificador de la membresía (UUIDv7). */
  readonly id: string;
  /** La persona. */
  readonly userId: string;
  /** El prestamista con el que trabaja. */
  readonly lenderId: string;
  /** Sus roles. */
  readonly roles: readonly Role[];
  /** Siempre `ACTIVE`: una membresía recién creada no nace desactivada. */
  readonly status: 'ACTIVE';
  /** Cartera del cobrador, o `null` si no tiene el rol. */
  readonly portfolioId: string | null;
  /** Cuándo se creó. */
  readonly createdAt: Date;
}
