import type {
  Membership,
  MembershipStatus,
} from '@/modules/memberships/domain/entities/membership.entity.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';

/** Criterio de {@link MembershipRepository.list}. */
export interface ListMembershipsCriteria {
  /** El prestamista dueño de las membresías. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Filtra por estado; ausente para traer `ACTIVE` e `INACTIVE` por igual. */
  readonly status?: MembershipStatus;
  /** Filtra por rol; ausente para traer cualquiera. */
  readonly role?: Role;
}

/** Una página de {@link MembershipRepository.list}. */
export interface MembershipsPage {
  /** Las membresías de esta página. */
  readonly items: readonly Membership[];
  /** Cuántas membresías cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

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

  /**
   * @param lenderId - El prestamista.
   * @param roles - Trae las membresías `ACTIVE` que tengan al menos uno de estos roles.
   * @returns Como `(userId, lenderId)` es único, hay a lo más una por persona.
   */
  findActiveByLenderAndRoles(
    lenderId: string,
    roles: readonly Role[],
  ): Promise<readonly Membership[]>;

  /**
   * @param portfolioId - La cartera.
   * @param lenderId - El prestamista dueño: una cartera de otro prestamista cuenta cero.
   * @returns Cuántas membresías `ACTIVE` la tienen asignada.
   */
  countActiveByPortfolio(
    portfolioId: string,
    lenderId: string,
  ): Promise<number>;

  /** @param membership - La membresía con sus datos ya actualizados. */
  update(membership: Membership): Promise<void>;

  /** @param criteria - Prestamista, paginación y los filtros opcionales de estado y rol. */
  list(criteria: ListMembershipsCriteria): Promise<MembershipsPage>;

  /**
   * La membresía, en cualquier estado, de alguien con esa cédula en este prestamista.
   *
   * @param lenderId - El prestamista.
   * @param nationalId - La cédula ya normalizada.
   */
  findByLenderAndNationalId(
    lenderId: string,
    nationalId: string,
  ): Promise<Membership | null>;

  /**
   * Cuántos cupos de cobrador ocupa el prestamista: membresías `ACTIVE` con `COLLECTOR` y sin
   * `OWNER` (el dueño no ocupa cupo).
   *
   * @param lenderId - El prestamista.
   */
  countCollectorSeats(lenderId: string): Promise<number>;

  /**
   * Cuántos cupos de administrador ocupa el prestamista: membresías `ACTIVE` con `LENDER` u
   * `OWNER` (la dueña cuenta).
   *
   * @param lenderId - El prestamista.
   */
  countAdminSeats(lenderId: string): Promise<number>;

  /**
   * Si la membresía tiene historial: asignaciones de cobro, visitas o cuadres (enviados o
   * revisados).
   *
   * @param id - La membresía.
   */
  hasHistory(id: string): Promise<boolean>;

  /**
   * Borra la membresía. Solo se llama cuando {@link MembershipRepository.hasHistory} es `false`.
   *
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño.
   */
  delete(id: string, lenderId: string): Promise<void>;
}
