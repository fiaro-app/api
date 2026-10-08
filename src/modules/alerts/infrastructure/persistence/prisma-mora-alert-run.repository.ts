import { Inject, Injectable } from '@nestjs/common';
import type { MoraAlertsResult } from '@/modules/alerts/domain/mora/mora-alerts-result.js';
import type { MoraAlertRunRepository } from '@/modules/alerts/domain/repositories/mora-alert-run.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda los días del aviso de mora en PostgreSQL (D-96). */
@Injectable()
export class PrismaMoraAlertRunRepository implements MoraAlertRunRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param businessDate - El día de negocio, AAAA-MM-DD. */
  async claim(businessDate: string): Promise<boolean> {
    const { count } = await this.prisma.moraAlertRun.createMany({
      data: [{ businessDate: toDate(businessDate) }],
      skipDuplicates: true,
    });
    return count === 1;
  }

  /**
   * @param businessDate - El día reclamado.
   * @param result - Lo que se envió.
   */
  async finish(businessDate: string, result: MoraAlertsResult): Promise<void> {
    await this.prisma.moraAlertRun.update({
      where: { businessDate: toDate(businessDate) },
      data: {
        finishedAt: this.clock.now(),
        lendersNotified: result.lendersNotified,
        loansInMora: result.loansInMora,
      },
    });
  }
}

/**
 * Un día de negocio como fecha a medianoche UTC, que es como Prisma guarda un `@db.Date`.
 *
 * @param businessDate - El día, AAAA-MM-DD.
 */
function toDate(businessDate: string): Date {
  return new Date(`${businessDate}T00:00:00.000Z`);
}
