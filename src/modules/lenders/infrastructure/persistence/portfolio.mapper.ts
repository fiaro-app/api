import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { PortfolioModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';

/** @param portfolio - Cartera nueva. */
export function toPortfolioCreateInput(
  portfolio: Portfolio,
): Prisma.PortfolioUncheckedCreateInput {
  return {
    id: portfolio.id,
    lenderId: portfolio.lenderId,
    name: portfolio.name,
    isDefault: portfolio.isDefault,
    createdAt: portfolio.createdAt,
  };
}

/** @param row - Fila de `portfolios`. */
export function toPortfolio(row: PortfolioModel): Portfolio {
  return Portfolio.create({
    id: row.id,
    lenderId: row.lenderId,
    name: row.name,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  });
}
