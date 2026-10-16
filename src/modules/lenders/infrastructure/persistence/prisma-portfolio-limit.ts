import { Injectable } from '@nestjs/common';
import type { PortfolioLimit } from '@/modules/lenders/application/ports/portfolio-limit.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link PortfolioLimit} leyendo la tabla `subscriptions` por el Tenant del prestamista.
 *
 * @remarks
 * Lee la tabla directamente en lugar de pasar por `subscriptions/application`: ese módulo ya
 * importa `LendersModule`, y el camino inverso cerraría un ciclo (igual que `memberships`).
 */
@Injectable()
export class PrismaPortfolioLimit implements PortfolioLimit {
  constructor(private readonly prisma: PrismaService) {}

  async maxPortfolios(lenderId: string): Promise<number | null> {
    const lender = await this.prisma.lender.findUnique({
      where: { id: lenderId },
      select: {
        tenant: {
          select: { subscription: { select: { maxPortfolios: true } } },
        },
      },
    });
    return lender?.tenant.subscription?.maxPortfolios ?? null;
  }
}
