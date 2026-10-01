import { Injectable } from '@nestjs/common';
import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { PaymentRepository } from '@/modules/collections/domain/repositories/payment.repository.js';
import { toPayment } from '@/modules/collections/infrastructure/persistence/collection-visit.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Consulta los pagos en PostgreSQL con Prisma. */
@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @remarks
   * Filtra por el `lenderId` del préstamo que pagó (`loan: { lenderId }`), no por un campo propio
   * de `Payment`: la tabla no guarda el prestamista directamente.
   *
   * @param id - Identificador del pago.
   * @param lenderId - El prestamista dueño del préstamo que pagó.
   */
  async findById(id: string, lenderId: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findFirst({
      where: { id, loan: { lenderId } },
    });
    return row === null ? null : toPayment(row);
  }
}
