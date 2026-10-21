import { Injectable } from '@nestjs/common';
import type { SubscriptionPayment } from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import { extendPeriod } from '@/modules/subscriptions/domain/policies/extend-period.js';
import {
  PLAN_CATALOG,
  type PurchasablePlanCode,
} from '@/modules/subscriptions/domain/plans/plan-catalog.js';
import type {
  PaymentResolution,
  ResolveOutcome,
  SubscriptionPaymentRepository,
} from '@/modules/subscriptions/domain/repositories/subscription-payment.repository.js';
import {
  toSubscriptionPayment,
  toSubscriptionPaymentCreateInput,
} from '@/modules/subscriptions/infrastructure/persistence/subscription-payment.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda las órdenes de pago de la suscripción en PostgreSQL con Prisma. */
@Injectable()
export class PrismaSubscriptionPaymentRepository implements SubscriptionPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param payment - Orden nueva. */
  async create(payment: SubscriptionPayment): Promise<void> {
    await this.prisma.subscriptionPayment.create({
      data: toSubscriptionPaymentCreateInput(payment),
    });
  }

  /** @param reference - La referencia de la orden. */
  async findByReference(
    reference: string,
  ): Promise<SubscriptionPayment | null> {
    const row = await this.prisma.subscriptionPayment.findUnique({
      where: { reference },
    });
    return row === null ? null : toSubscriptionPayment(row);
  }

  /**
   * @param tenantId - El negocio.
   * @param limit - Cuántas como máximo.
   */
  async listByTenant(
    tenantId: string,
    limit: number,
  ): Promise<readonly SubscriptionPayment[]> {
    const rows = await this.prisma.subscriptionPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toSubscriptionPayment);
  }

  /**
   * La orden pasa a `APPROVED` solo si seguía `PENDING` (así un aviso repetido no suma otro mes) y,
   * en la misma transacción, la suscripción toma el plan comprado y el período se extiende. La
   * fila de la suscripción se bloquea mientras se lee y se escribe: dos pagos del mismo negocio
   * a la vez no se pisan.
   *
   * @param resolution - Lo que dice el aviso de Wompi.
   */
  async approve(resolution: PaymentResolution): Promise<ResolveOutcome> {
    return await this.prisma.$transaction(async (tx) => {
      const resolved = await tx.subscriptionPayment.updateMany({
        where: { reference: resolution.reference, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          wompiTransactionId: resolution.wompiTransactionId,
          paymentMethodType: resolution.paymentMethodType,
          resolvedAt: resolution.resolvedAt,
        },
      });
      if (resolved.count === 0) {
        return 'ALREADY_RESOLVED';
      }
      const payment = await tx.subscriptionPayment.findUniqueOrThrow({
        where: { reference: resolution.reference },
      });
      await tx.$queryRaw`SELECT 1 FROM subscriptions WHERE tenant_id = ${payment.tenantId}::uuid FOR UPDATE`;
      const subscription = await tx.subscription.findUniqueOrThrow({
        where: { tenantId: payment.tenantId },
      });
      const limits = PLAN_CATALOG[payment.planCode as PurchasablePlanCode];
      const periodEndsAt = extendPeriod(
        subscription.currentPeriodEndsAt,
        resolution.resolvedAt,
        payment.months,
      );
      await tx.subscription.update({
        where: { tenantId: payment.tenantId },
        data: {
          planCode: payment.planCode,
          ...limits,
          currentPeriodEndsAt: periodEndsAt,
        },
      });
      await tx.subscriptionPayment.update({
        where: { reference: resolution.reference },
        data: { periodEndsAt },
      });
      return 'APPLIED';
    });
  }

  /**
   * @param resolution - Lo que dice el aviso de Wompi.
   * @param status - Cómo cerró Wompi la orden.
   */
  async reject(
    resolution: PaymentResolution,
    status: 'DECLINED' | 'VOIDED' | 'ERROR',
  ): Promise<ResolveOutcome> {
    const resolved = await this.prisma.subscriptionPayment.updateMany({
      where: { reference: resolution.reference, status: 'PENDING' },
      data: {
        status,
        wompiTransactionId: resolution.wompiTransactionId,
        paymentMethodType: resolution.paymentMethodType,
        resolvedAt: resolution.resolvedAt,
      },
    });
    return resolved.count === 0 ? 'ALREADY_RESOLVED' : 'APPLIED';
  }
}
