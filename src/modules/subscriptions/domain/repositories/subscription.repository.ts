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
}
