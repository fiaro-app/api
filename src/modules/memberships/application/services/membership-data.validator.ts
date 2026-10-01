import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import type { DomainIssue } from '@/shared/domain/errors/domain-error.js';

/** Los tres roles que existen hoy (`Role`, ARCHITECTURE.md §3: el dominio no importa el contrato). */
const VALID_ROLES: readonly Role[] = ['OWNER', 'LENDER', 'COLLECTOR'];

/** Roles y cartera tal como los recibe el alta o el cambio de roles. */
export interface MembershipDataInput {
  /** Los roles pedidos, sin validar todavía. */
  readonly roles: readonly Role[];
  /** La cartera, si el pedido trae una. */
  readonly portfolioId?: string | null;
}

/** Roles y cartera ya validados. */
export interface ValidMembershipData {
  /** Sin repetidos, al menos uno, todos roles válidos. */
  readonly roles: readonly Role[];
  /** `null` si `roles` no incluye `COLLECTOR`. */
  readonly portfolioId: string | null;
}

/**
 * Valida que `roles` traiga al menos uno, sin repetidos y todos del catálogo, y que venga
 * `portfolioId` cuando incluye `COLLECTOR` (PRODUCT.md §5: "nunca es null si roles incluye
 * COLLECTOR") — la validación que `CreateMembershipUseCase` dejó pendiente a propósito (D-73)
 * hasta que existiera un invocador que recibiera estos datos de afuera.
 *
 * @param input - Los roles pedidos y la cartera, si trae una.
 * @returns Los roles tal cual (ya se validó que son válidos) y la cartera, o `null` si no aplica.
 * @throws {@link InvalidMembershipDataError} Con un `issue` por cada regla que no se cumple.
 */
export function validateMembershipData(
  input: MembershipDataInput,
): ValidMembershipData {
  const issues: DomainIssue[] = [];
  const { roles } = input;
  const unique = new Set(roles);

  if (roles.length === 0) {
    issues.push({
      path: ['roles'],
      message: 'Debes elegir al menos un rol.',
      params: {},
    });
  } else if (unique.size !== roles.length) {
    issues.push({
      path: ['roles'],
      message: 'Los roles no se pueden repetir.',
      params: {},
    });
  } else if (roles.some((role) => !VALID_ROLES.includes(role))) {
    issues.push({ path: ['roles'], message: 'Rol inválido.', params: {} });
  }

  const portfolioId = input.portfolioId ?? null;
  if (roles.includes('COLLECTOR') && portfolioId === null) {
    issues.push({
      path: ['portfolioId'],
      message: 'El rol COLLECTOR exige una cartera.',
      params: {},
    });
  }

  if (issues.length > 0) {
    throw new InvalidMembershipDataError(issues);
  }
  return {
    roles,
    portfolioId: roles.includes('COLLECTOR') ? portfolioId : null,
  };
}
