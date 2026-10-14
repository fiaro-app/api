import type { PortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.dto.js';
import type { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';

/** @param portfolio - La cartera. */
export function toPortfolioDetails(portfolio: Portfolio): PortfolioDetails {
  return {
    id: portfolio.id,
    name: portfolio.name,
    isDefault: portfolio.isDefault,
    createdAt: portfolio.createdAt,
  };
}
