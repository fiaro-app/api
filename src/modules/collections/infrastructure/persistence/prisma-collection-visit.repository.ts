import { Injectable } from '@nestjs/common';
import type { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import {
  toCollectionVisit,
  toCollectionVisitCreateInput,
  toCollectionVisitRecord,
  toPaymentCreateInput,
  WITH_PAYMENT_AND_REVERSAL,
} from '@/modules/collections/infrastructure/persistence/collection-visit.mapper.js';
import { businessRangeInstants } from '@/shared/domain/calendar/business-date.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a las visitas de cobro y sus pagos en PostgreSQL con Prisma. */
@Injectable()
export class PrismaCollectionVisitRepository implements CollectionVisitRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param visit - Visita nueva.
   * @param payment - Su pago, o `null` si `outcome` no fue `PAID`.
   */
  async create(visit: CollectionVisit, payment: Payment | null): Promise<void> {
    const operations = [
      this.prisma.collectionVisit.create({
        data: toCollectionVisitCreateInput(visit),
      }),
      ...(payment === null
        ? []
        : [
            this.prisma.payment.create({ data: toPaymentCreateInput(payment) }),
          ]),
    ];
    await this.prisma.$transaction(operations);
  }

  /**
   * @param id - Identificador de la visita.
   * @param loanId - El préstamo dueño.
   */
  async findById(
    id: string,
    loanId: string,
  ): Promise<CollectionVisitRecord | null> {
    const row = await this.prisma.collectionVisit.findFirst({
      where: { id, loanId },
      include: WITH_PAYMENT_AND_REVERSAL,
    });
    return row === null ? null : toCollectionVisitRecord(row);
  }

  /** @param loanId - El préstamo. */
  async listByLoan(loanId: string): Promise<readonly CollectionVisitRecord[]> {
    const rows = await this.prisma.collectionVisit.findMany({
      where: { loanId },
      include: WITH_PAYMENT_AND_REVERSAL,
      orderBy: { occurredAt: 'asc' },
    });
    return rows.map(toCollectionVisitRecord);
  }

  /**
   * @param collectorMembershipId - El cobrador que hizo la promesa.
   * @param promisedDate - Fecha de calendario (`AAAA-MM-DD`).
   */
  async listByCollectorAndPromisedDate(
    collectorMembershipId: string,
    promisedDate: string,
  ): Promise<readonly CollectionVisit[]> {
    const rows = await this.prisma.collectionVisit.findMany({
      where: { collectorMembershipId, promisedDate },
      orderBy: { occurredAt: 'asc' },
    });
    return rows.map(toCollectionVisit);
  }

  /**
   * @param collectorMembershipId - El cobrador.
   * @param from - Primera fecha del rango (`AAAA-MM-DD`), inclusive.
   * @param to - Última fecha del rango (`AAAA-MM-DD`), inclusive.
   */
  async listByCollectorAndDateRange(
    collectorMembershipId: string,
    from: string,
    to: string,
  ): Promise<readonly CollectionVisitRecord[]> {
    const range = businessRangeInstants(from, to);
    const rows = await this.prisma.collectionVisit.findMany({
      where: {
        collectorMembershipId,
        occurredAt: { gte: range.start, lt: range.end },
      },
      include: WITH_PAYMENT_AND_REVERSAL,
      orderBy: { occurredAt: 'asc' },
    });
    return rows.map(toCollectionVisitRecord);
  }
}
