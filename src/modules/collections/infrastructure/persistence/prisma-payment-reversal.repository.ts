import { Injectable } from '@nestjs/common';
import type { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import { PaymentAlreadyReversedError } from '@/modules/collections/domain/errors/payment-already-reversed.error.js';
import type { PaymentReversalRepository } from '@/modules/collections/domain/repositories/payment-reversal.repository.js';
import { toPaymentReversalCreateInput } from '@/modules/collections/infrastructure/persistence/collection-visit.mapper.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Código de Prisma para una restricción de unicidad violada. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Guarda a las reversiones de pago en PostgreSQL con Prisma. */
@Injectable()
export class PrismaPaymentReversalRepository implements PaymentReversalRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @remarks
   * La única restricción de unicidad de una reversión es `paymentId`: cualquier `P2002` en este
   * `create` significa que ese pago ya tiene una (mismo patrón que `PrismaClientRepository.create`,
   * D-76).
   *
   * @param reversal - Reversión nueva.
   * @throws {@link PaymentAlreadyReversedError} Si ese pago ya tiene una reversión.
   */
  async create(reversal: PaymentReversal): Promise<void> {
    try {
      await this.prisma.paymentReversal.create({
        data: toPaymentReversalCreateInput(reversal),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new PaymentAlreadyReversedError();
      }
      throw error;
    }
  }
}
