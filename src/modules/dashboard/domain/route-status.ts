/** En qué va la ruta de un cobrador hoy. */
export type RouteStatus =
  'NO_ROUTE' | 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';

/**
 * El estado de la ruta de un cobrador: sin préstamos asignados, sin ninguna visita todavía, en
 * marcha o con todos sus préstamos visitados.
 *
 * @param routeLoans - Préstamos en su ruta de hoy.
 * @param visitedLoans - De esos, cuántos ya visitó.
 * @param visits - Visitas que registró hoy (incluye las de préstamos fuera de su ruta).
 */
export function routeStatus(
  routeLoans: number,
  visitedLoans: number,
  visits: number,
): RouteStatus {
  if (routeLoans === 0) {
    return 'NO_ROUTE';
  }
  if (visitedLoans >= routeLoans) {
    return 'FINISHED';
  }
  return visits === 0 ? 'NOT_STARTED' : 'IN_PROGRESS';
}

/** Orden en el que se listan: primero a quien hay que mirar. */
const ORDER: Record<RouteStatus, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  FINISHED: 2,
  NO_ROUTE: 3,
};

/** @param status - El estado de una ruta. @returns Su posición en la lista (menor = primero). */
export function routeStatusOrder(status: RouteStatus): number {
  return ORDER[status];
}
