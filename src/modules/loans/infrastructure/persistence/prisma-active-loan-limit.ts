import { Injectable } from '@nestjs/common';
import type { ActiveLoanLimit } from '@/modules/loans/application/ports/active-loan-limit.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link ActiveLoanLimit} leyendo la tabla `subscriptions` por el Tenant del prestamista.
 *
 * @remarks
 * Lee la tabla directamente en lugar de pasar por `subscriptions/application`, que ya importa
 * `LoansModule` para contar el uso: el camino inverso cerraría un ciclo.
 */
@Injectable()
export class PrismaActiveLoanLimit implements ActiveLoanLimit {
  constructor(private readonly prisma: PrismaService) {}

  async maxActiveLoans(lenderId: string): Promise<number | null> {
    const lender = await this.prisma.lender.findUnique({
      where: { id: lenderId },
      select: {
        tenant: {
          select: { subscription: { select: { maxActiveLoans: true } } },
        },
      },
    });
    return lender?.tenant.subscription?.maxActiveLoans ?? null;
  }
}
