import { Injectable } from '@nestjs/common';
import type { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import {
  toCollectionVisit,
  toCollectionVisitCreateInput,
  toPayment,
  toPaymentCreateInput,
} from '@/modules/collections/infrastructure/persistence/collection-visit.mapper.js';
import type { CollectionVisitModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Fila de `collection_visits` con su `payment`, tal como la trae un `include: { payment: true }`. */
type CollectionVisitRowWithPayment = CollectionVisitModel & {
  payment: Parameters<typeof toPayment>[0] | null;
};

/** @param row - Fila con su pago, si lo trae. */
function toRecord(row: CollectionVisitRowWithPayment): CollectionVisitRecord {
  return {
    visit: toCollectionVisit(row),
    payment: row.payment === null ? null : toPayment(row.payment),
  };
}

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
      include: { payment: true },
    });
    return row === null ? null : toRecord(row);
  }

  /** @param loanId - El préstamo. */
  async listByLoan(loanId: string): Promise<readonly CollectionVisitRecord[]> {
    const rows = await this.prisma.collectionVisit.findMany({
      where: { loanId },
      include: { payment: true },
      orderBy: { occurredAt: 'asc' },
    });
    return rows.map(toRecord);
  }
}
