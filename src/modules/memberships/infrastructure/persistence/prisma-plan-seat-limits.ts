import { Injectable } from '@nestjs/common';
import type { PlanSeatLimits } from '@/modules/memberships/application/ports/plan-seat-limits.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link PlanSeatLimits} leyendo la tabla `subscriptions` por el Tenant del prestamista.
 *
 * @remarks
 * Lee la tabla directamente en lugar de pasar por `subscriptions/application`: ese módulo ya
 * importa `MembershipsModule` (para contar el uso), y el camino inverso cerraría un ciclo.
 */
@Injectable()
export class PrismaPlanSeatLimits implements PlanSeatLimits {
  constructor(private readonly prisma: PrismaService) {}

  async maxCollectors(lenderId: string): Promise<number | null> {
    return (await this.subscriptionOf(lenderId))?.maxCollectors ?? null;
  }

  async maxAdmins(lenderId: string): Promise<number | null> {
    return (await this.subscriptionOf(lenderId))?.maxAdmins ?? null;
  }

  private async subscriptionOf(
    lenderId: string,
  ): Promise<{ maxCollectors: number; maxAdmins: number } | null> {
    const lender = await this.prisma.lender.findUnique({
      where: { id: lenderId },
      select: {
        tenant: {
          select: {
            subscription: {
              select: { maxCollectors: true, maxAdmins: true },
            },
          },
        },
      },
    });
    return lender?.tenant.subscription ?? null;
  }
}
