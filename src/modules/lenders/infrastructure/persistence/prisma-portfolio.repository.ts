import { Injectable } from '@nestjs/common';
import type { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import { PortfolioNameTakenError } from '@/modules/lenders/domain/errors/portfolio-name-taken.error.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';
import {
  toPortfolio,
  toPortfolioCreateInput,
} from '@/modules/lenders/infrastructure/persistence/portfolio.mapper.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Código de Prisma para una restricción de unicidad violada. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Guarda a las carteras en PostgreSQL con Prisma. */
@Injectable()
export class PrismaPortfolioRepository implements PortfolioRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @remarks
   * La única restricción de unicidad de una cartera es `(lenderId, name)`: cualquier `P2002` en
   * este `create` significa que el nombre ya lo usa otra cartera del mismo prestamista.
   *
   * @param portfolio - Cartera nueva.
   * @throws {@link PortfolioNameTakenError} Si el nombre ya lo usa otra cartera del mismo
   * prestamista.
   */
  async create(portfolio: Portfolio): Promise<void> {
    try {
      await this.prisma.portfolio.create({
        data: toPortfolioCreateInput(portfolio),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new PortfolioNameTakenError();
      }
      throw error;
    }
  }

  /** @param lenderId - El prestamista dueño. */
  async listByLender(lenderId: string): Promise<readonly Portfolio[]> {
    const rows = await this.prisma.portfolio.findMany({
      where: { lenderId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toPortfolio);
  }
}
