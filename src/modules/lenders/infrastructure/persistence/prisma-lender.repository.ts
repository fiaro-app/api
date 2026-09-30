import { Injectable } from '@nestjs/common';
import type { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';
import {
  toLender,
  toLenderCreateInput,
} from '@/modules/lenders/infrastructure/persistence/lender.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a los prestamistas en PostgreSQL con Prisma. */
@Injectable()
export class PrismaLenderRepository implements LenderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param lender - Prestamista nuevo.
   * @param defaultPortfolioId - Identificador de la fila de la cartera por defecto.
   */
  async create(lender: Lender, defaultPortfolioId: string): Promise<void> {
    await this.prisma.lender.create({
      data: toLenderCreateInput(lender, defaultPortfolioId),
    });
  }

  /** @param id - Identificador del prestamista. */
  async findById(id: string): Promise<Lender | null> {
    const row = await this.prisma.lender.findUnique({ where: { id } });
    return row === null ? null : toLender(row);
  }
}
