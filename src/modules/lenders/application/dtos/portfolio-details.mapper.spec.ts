import { describe, expect, it } from 'vitest';
import { toPortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.mapper.js';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';

describe('toPortfolioDetails', () => {
  it('devuelve los datos públicos de la cartera', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const portfolio = Portfolio.create({
      id: 'portfolio-1',
      lenderId: 'lender-1',
      name: 'Zona Norte',
      isDefault: false,
      createdAt,
    });

    expect(toPortfolioDetails(portfolio)).toEqual({
      id: 'portfolio-1',
      name: 'Zona Norte',
      isDefault: false,
      createdAt,
    });
  });
});
