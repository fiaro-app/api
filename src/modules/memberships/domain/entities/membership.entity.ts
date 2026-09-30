import type { Role } from '@/modules/memberships/domain/entities/role.js';

/** `INACTIVE` quita el acceso de inmediato y conserva todo el historial. */
export type MembershipStatus = 'ACTIVE' | 'INACTIVE';

/** Datos con los que se construye una {@link Membership}. */
export interface MembershipProps {
  /** Identificador de la membresía (UUIDv7). */
  readonly id: string;
  /** La persona. */
  readonly userId: string;
  /** El prestamista con el que trabaja. */
  readonly lenderId: string;
  /** Sin repetidos y con al menos un rol. */
  readonly roles: readonly Role[];
  readonly status: MembershipStatus;
  /** Cartera del cobrador. Nunca es `null` si `roles` incluye `COLLECTOR`. */
  readonly portfolioId: string | null;
  /** Cuándo se creó. */
  readonly createdAt: Date;
  /** Cuándo se desactivó, o `null` si sigue activa. */
  readonly deactivatedAt: Date | null;
}

/**
 * Relación entre una persona (`User`) y un prestamista (`Lender`), con sus roles. Los cobros,
 * cuadres y asignaciones apuntan a la membresía, no al usuario, porque una persona puede trabajar
 * para más de un prestamista (PRODUCT.md §5).
 */
export class Membership {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly lenderId: string,
    public readonly roles: readonly Role[],
    public readonly status: MembershipStatus,
    public readonly portfolioId: string | null,
    public readonly createdAt: Date,
    public readonly deactivatedAt: Date | null,
  ) {}

  /**
   * Construye la membresía con sus datos ya validados.
   *
   * @param props - Datos de la membresía.
   */
  static create(props: MembershipProps): Membership {
    return new Membership(
      props.id,
      props.userId,
      props.lenderId,
      props.roles,
      props.status,
      props.portfolioId,
      props.createdAt,
      props.deactivatedAt,
    );
  }
}
