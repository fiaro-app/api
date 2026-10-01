import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';

/** Datos con los que se invita a un colaborador. */
export interface InviteMembershipInput {
  /** El prestamista que invita, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** Celular en formato E.164. */
  readonly phone: string;
  /** Nombre completo. Se ignora si el celular ya tiene cuenta: se usa el nombre que ya tenía. */
  readonly fullName: string;
  /** Cédula. Obligatoria si `roles` incluye `COLLECTOR` y el celular no tiene cuenta todavía. */
  readonly nationalId?: string | null;
  /** Correo real de la persona. Se ignora si el celular ya tiene cuenta. */
  readonly contactEmail?: string | null;
  /** Sin repetidos y con al menos un rol. */
  readonly roles: readonly Role[];
  /** Cartera del cobrador. Obligatoria si `roles` incluye `COLLECTOR`. */
  readonly portfolioId?: string | null;
}

/** Lo que devuelve invitar: la membresía creada y, si la persona es nueva, su contraseña temporal. */
export interface InvitedMembership {
  /** La membresía recién creada. */
  readonly membership: MembershipDetails;
  /**
   * La contraseña temporal, en claro, para que quien invita se la pase a la persona (por
   * WhatsApp, PRODUCT.md §5). Se muestra una sola vez: nunca se guarda en claro ni se puede
   * volver a pedir. `null` si el celular ya tenía cuenta: esa persona ya conoce su contraseña.
   */
  readonly tempPassword: string | null;
}
