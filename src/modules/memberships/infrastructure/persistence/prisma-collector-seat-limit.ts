import { Injectable } from '@nestjs/common';
import type { CollectorSeatLimit } from '@/modules/memberships/application/ports/collector-seat-limit.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link CollectorSeatLimit} leyendo la tabla `subscriptions` por el Tenant del prestamista.
 *
 * @remarks
 * Lee la tabla directamente en lugar de pasar por `subscriptions/application`: ese módulo ya
 * importa `MembershipsModule` (para contar el uso), y el camino inverso cerraría un ciclo.
 */
@Injectable()
export class PrismaCollectorSeatLimit implements CollectorSeatLimit {
  constructor(private readonly prisma: PrismaService) {}

  async maxCollectors(lenderId: string): Promise<number | null> {
    const lender = await this.prisma.lender.findUnique({
      where: { id: lenderId },
      select: {
        tenant: {
          select: { subscription: { select: { maxCollectors: true } } },
        },
      },
    });
    return lender?.tenant.subscription?.maxCollectors ?? null;
  }
}
