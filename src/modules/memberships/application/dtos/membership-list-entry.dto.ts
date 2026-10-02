import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import type { MembershipStatus } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';

/** Entrada de {@link ListMembershipsUseCase}. */
export interface ListMembershipsInput {
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

/** Entrada de {@link ListMembershipsUseCase}: una membresía con el nombre y el celular de quien la tiene. */
export interface MembershipListEntry extends MembershipDetails {
  /** Nombre completo de la persona. */
  readonly fullName: string;
  /** Su celular, en formato E.164. */
  readonly phone: string;
}

/** Página de {@link ListMembershipsUseCase}. */
export interface MembershipsPageResult {
  /** Las membresías de esta página, con nombre y celular. */
  readonly items: readonly MembershipListEntry[];
  /** Cuántas cumplen el criterio en total, sin paginar. */
  readonly total: number;
}
