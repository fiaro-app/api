import type { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';

/** Puerto de persistencia de las suscripciones. */
export interface SubscriptionRepository {
  /** @param subscription - Suscripción nueva. */
  create(subscription: Subscription): Promise<void>;

  /**
   * @param tenantId - El Tenant.
   * @returns Su suscripción, o `null` si no tiene.
   */
  findByTenant(tenantId: string): Promise<Subscription | null>;

  /**
   * Las suscripciones cuyo período termina dentro de una ventana: la base de los recordatorios de
   * vencimiento (D-150), que corren sin sesión y recorren a todos los negocios.
   *
   * @param from - Inicio de la ventana (inclusive).
   * @param to - Fin de la ventana (inclusive).
   */
  listEndingBetween(from: Date, to: Date): Promise<readonly Subscription[]>;
}
