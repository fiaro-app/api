import type { PlanFeature } from '@/shared/domain/subscriptions/plan-features.js';

/** Dice qué permite el plan del negocio: escribir (PRODUCT.md §7) y las funciones propias de cada plan (D-151). */
export interface SubscriptionAccess {
  /**
   * @param lenderId - El prestamista con el que opera la sesión.
   * @returns `true` si la suscripción de su Tenant terminó la gracia y es solo lectura. Un
   * Tenant sin suscripción (alta caída a medias, D-115) no se bloquea.
   */
  isReadOnly(lenderId: string): Promise<boolean>;

  /**
   * @param lenderId - El prestamista con el que opera la sesión.
   * @param feature - La función que se quiere usar.
   * @returns `true` si el plan de su Tenant la trae. Un Tenant sin suscripción (alta caída a medias,
   * D-115) no se bloquea.
   */
  hasFeature(lenderId: string, feature: PlanFeature): Promise<boolean>;
}
