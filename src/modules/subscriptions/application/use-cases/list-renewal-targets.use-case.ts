import { Inject, Injectable } from '@nestjs/common';
import type {
  TenantOwner,
  TenantOwners,
} from '@/modules/subscriptions/application/ports/tenant-owners.port.js';
import { TENANT_OWNERS } from '@/modules/subscriptions/application/ports/tenant-owners.token.js';
import type { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import type { SubscriptionRepository } from '@/modules/subscriptions/domain/repositories/subscription.repository.js';
import { SUBSCRIPTION_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-repository.token.js';

/** Un negocio cuyo plan termina cerca, con las personas a quienes hay que avisarle. */
export interface RenewalTarget {
  readonly subscription: Subscription;
  readonly owners: readonly TenantOwner[];
}

/**
 * Los negocios cuyo plan termina dentro de una ventana, con su dueña. Lo usa `alerts` para los
 * recordatorios de vencimiento (D-150), que corren sin sesión y por eso consultan a todos los negocios.
 */
@Injectable()
export class ListRenewalTargetsUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
    @Inject(TENANT_OWNERS) private readonly tenantOwners: TenantOwners,
  ) {}

  /**
   * @param from - Inicio de la ventana (inclusive).
   * @param to - Fin de la ventana (inclusive).
   */
  async execute(from: Date, to: Date): Promise<readonly RenewalTarget[]> {
    const subscriptions = await this.subscriptions.listEndingBetween(from, to);
    return await Promise.all(
      subscriptions.map(async (subscription) => ({
        subscription,
        owners: await this.tenantOwners.ownersOf(subscription.tenantId),
      })),
    );
  }
}
