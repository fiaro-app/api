/** Días de gracia después del vencimiento, antes de pasar a solo lectura (D-21, PRODUCT.md §7). */
export const SUBSCRIPTION_GRACE_DAYS = 7;

/**
 * Estado de la suscripción, calculado a partir de las fechas:
 * - `ACTIVE`: el período pagado está vigente.
 * - `GRACE_PERIOD`: venció hace menos de {@link SUBSCRIPTION_GRACE_DAYS} días; todo funciona y la
 *   app muestra el aviso de renovación.
 * - `READ_ONLY`: terminó la gracia; solo se permiten lecturas y registrar visitas y pagos.
 *
 * Mismos valores que `SubscriptionStatusSchema` de `@fiaro-app/contracts`; el dominio no importa el
 * contrato (regla de dependencia, ARCHITECTURE.md §3), así que los repite.
 */
export type SubscriptionStatus = 'ACTIVE' | 'GRACE_PERIOD' | 'READ_ONLY';

/** Cómo está una suscripción en un momento dado. */
export interface SubscriptionState {
  readonly status: SubscriptionStatus;
  /** Fin del período pagado más los días de gracia: desde ahí es solo lectura. */
  readonly graceEndsAt: Date;
  /**
   * Cuántos días enteros faltan para el fin del período pagado; cero si ya venció. Con el período
   * ya vencido, el aviso de renovación usa `graceDaysRemaining`.
   */
  readonly daysRemaining: number;
  /** Cuántos días enteros quedan de gracia; cero fuera de la gracia. */
  readonly graceDaysRemaining: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param ms - Milisegundos hasta un momento futuro.
 * @returns Los días enteros que faltan, redondeando hacia arriba: faltando 1 hora, falta 1 día.
 */
function daysUntil(ms: number): number {
  return Math.max(0, Math.ceil(ms / MS_PER_DAY));
}

/**
 * Calcula el estado de una suscripción.
 *
 * @remarks
 * El fin del período es inclusive: en el instante exacto del vencimiento sigue `ACTIVE`, y en el
 * del fin de la gracia sigue `GRACE_PERIOD`.
 *
 * @param currentPeriodEndsAt - Hasta cuándo está pagado el período.
 * @param now - El momento de la consulta.
 */
export function computeSubscriptionState(
  currentPeriodEndsAt: Date,
  now: Date,
): SubscriptionState {
  const graceEndsAt = new Date(
    currentPeriodEndsAt.getTime() + SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY,
  );
  const nowMs = now.getTime();
  if (nowMs <= currentPeriodEndsAt.getTime()) {
    return {
      status: 'ACTIVE',
      graceEndsAt,
      daysRemaining: daysUntil(currentPeriodEndsAt.getTime() - nowMs),
      graceDaysRemaining: 0,
    };
  }
  if (nowMs <= graceEndsAt.getTime()) {
    return {
      status: 'GRACE_PERIOD',
      graceEndsAt,
      daysRemaining: 0,
      graceDaysRemaining: daysUntil(graceEndsAt.getTime() - nowMs),
    };
  }
  return {
    status: 'READ_ONLY',
    graceEndsAt,
    daysRemaining: 0,
    graceDaysRemaining: 0,
  };
}
