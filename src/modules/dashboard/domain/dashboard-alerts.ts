/** Lo que hace falta para generar las alertas de texto del resumen del Lender. */
export interface DashboardAlertCounts {
  /** Cobradores activos que no han registrado ninguna visita hoy. */
  readonly collectorsWithoutRouteStarted: number;
  /** Cuadres `PENDING` cuyo `collectedAmount` difiere de `expectedAmount`. */
  readonly settlementsWithDifferences: number;
}

/**
 * Alertas de texto del resumen del Lender (PROTOTIPO-FLUJOS.md §4.6): "reglas de negocio
 * propias", no un conteo plano — por eso son frases ya armadas, no los números sueltos.
 *
 * @param counts - Cuántos cobradores y cuántos cuadres disparan cada alerta.
 * @returns Una frase por cada condición que se cumple; vacío si ninguna se cumple.
 */
export function buildDashboardAlerts(
  counts: DashboardAlertCounts,
): readonly string[] {
  const alerts: string[] = [];
  const withoutRoute = counts.collectorsWithoutRouteStarted;
  if (withoutRoute === 1) {
    alerts.push('1 cobrador aún no ha iniciado su ruta hoy.');
  } else if (withoutRoute > 1) {
    alerts.push(
      `${String(withoutRoute)} cobradores aún no han iniciado su ruta hoy.`,
    );
  }
  const withDifferences = counts.settlementsWithDifferences;
  if (withDifferences === 1) {
    alerts.push('1 cuadre tiene diferencias pendientes de revisar.');
  } else if (withDifferences > 1) {
    alerts.push(
      `${String(withDifferences)} cuadres tienen diferencias pendientes de revisar.`,
    );
  }
  return alerts;
}
