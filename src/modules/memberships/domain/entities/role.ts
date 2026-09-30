/**
 * Roles dentro de un prestamista, acumulables: el operador que trabaja solo tiene los tres.
 * - `OWNER`: dueño; paga la suscripción.
 * - `LENDER`: administra clientes, préstamos, cobradores y cuadres.
 * - `COLLECTOR`: cobra en campo los préstamos que tiene asignados.
 *
 * Mismos valores que `RoleSchema` de `@fiaro-app/contracts`; el dominio no importa el contrato
 * (regla de dependencia, ARCHITECTURE.md §3), así que los repite.
 */
export type Role = 'OWNER' | 'LENDER' | 'COLLECTOR';
