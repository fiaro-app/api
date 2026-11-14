import { Inject, Injectable } from '@nestjs/common';
import type { SubscriptionReminderRunRepository } from '@/modules/alerts/domain/repositories/subscription-reminder-run.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda los días de los recordatorios de vencimiento en PostgreSQL (D-150). */
@Injectable()
export class PrismaSubscriptionReminderRunRepository implements SubscriptionReminderRunRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param businessDate - El día de negocio, AAAA-MM-DD. */
  async claim(businessDate: string): Promise<boolean> {
    const { count } = await this.prisma.subscriptionReminderRun.createMany({
      data: [{ businessDate: toDate(businessDate) }],
      skipDuplicates: true,
    });
    return count === 1;
  }

  /**
   * @param businessDate - El día reclamado.
   * @param remindersSent - A cuántas personas se les recordó.
   */
  async finish(businessDate: string, remindersSent: number): Promise<void> {
    await this.prisma.subscriptionReminderRun.update({
      where: { businessDate: toDate(businessDate) },
      data: { finishedAt: this.clock.now(), remindersSent },
    });
  }
}

/** @param businessDate - El día, AAAA-MM-DD, como medianoche UTC (así guarda Prisma un `@db.Date`). */
function toDate(businessDate: string): Date {
  return new Date(`${businessDate}T00:00:00.000Z`);
}
