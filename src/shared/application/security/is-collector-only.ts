import { hasAnyRole } from '@/shared/application/security/has-any-role.js';

/** Los roles que administran el negocio: ven todo lo del prestamista. */
const MANAGER_ROLES = ['OWNER', 'LENDER'];

/**
 * Si la membresía solo puede cobrar: no administra. Un cobrador así ve únicamente lo suyo (sus
 * préstamos asignados, sus cuadres); quien además es `OWNER` o `LENDER` ve todo.
 *
 * @param roles - Los roles de la membresía activa (`LenderScope.roles`).
 */
export function isCollectorOnly(roles: readonly string[]): boolean {
  return !hasAnyRole(roles, MANAGER_ROLES);
}
