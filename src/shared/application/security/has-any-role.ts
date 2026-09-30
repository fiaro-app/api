/**
 * Si la membresía activa tiene al menos uno de los roles que la ruta exige. Función pura: no
 * conoce HTTP ni ningún módulo, así que la usan los controllers de cualquiera (`lenders`,
 * `clients`...) sin que uno importe el dominio de otro.
 *
 * @remarks
 * No es la matriz completa de autorización (`PERMISSIONS.md`, pendiente): cada controller decide
 * todavía qué roles exige cada ruta, a mano. Esto solo evita repetir la comparación `Set`.
 *
 * @param roles - Los roles de la membresía activa (`LenderScope.roles`).
 * @param required - Los roles que alguno de ellos debe estar entre.
 */
export function hasAnyRole(
  roles: readonly string[],
  required: readonly string[],
): boolean {
  const requiredSet = new Set(required);
  return roles.some((role) => requiredSet.has(role));
}
