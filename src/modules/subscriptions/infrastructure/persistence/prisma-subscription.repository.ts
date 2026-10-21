import { Injectable } from '@nestjs/common';
import type { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import type { SubscriptionRepository } from '@/modules/subscriptions/domain/repositories/subscription.repository.js';
import {
  toSubscription,
  toSubscriptionCreateInput,
} from '@/modules/subscriptions/infrastructure/persistence/subscription.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda las suscripciones en PostgreSQL con Prisma. */
@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param subscription - Suscripción nueva. */
  async create(subscription: Subscription): Promise<void> {
    await this.prisma.subscription.create({
      data: toSubscriptionCreateInput(subscription),
    });
  }

  /** @param tenantId - El Tenant. */
  async findByTenant(tenantId: string): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    return row === null ? null : toSubscription(row);
  }

  /**
   * @param from - Inicio de la ventana (inclusive).
   * @param to - Fin de la ventana (inclusive).
   */
  async listEndingBetween(
    from: Date,
    to: Date,
  ): Promise<readonly Subscription[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { currentPeriodEndsAt: { gte: from, lte: to } },
      orderBy: { currentPeriodEndsAt: 'asc' },
    });
    return rows.map(toSubscription);
  }
}
