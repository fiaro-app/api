import { describe, expect, it } from 'vitest';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import {
  toPortfolio,
  toPortfolioCreateInput,
} from '@/modules/lenders/infrastructure/persistence/portfolio.mapper.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

describe('toPortfolioCreateInput', () => {
  it('convierte a la cartera en la fila de portfolios', () => {
    const portfolio = Portfolio.create({
      id: 'portfolio-1',
      lenderId: 'lender-1',
      name: 'Zona Norte',
      isDefault: false,
      createdAt: CREATED_AT,
    });

    expect(toPortfolioCreateInput(portfolio)).toEqual({
      id: 'portfolio-1',
      lenderId: 'lender-1',
      name: 'Zona Norte',
      isDefault: false,
      createdAt: CREATED_AT,
    });
  });
});

describe('toPortfolio', () => {
  it('convierte la fila de portfolios en la entidad de dominio', () => {
    const row = {
      id: 'portfolio-1',
      lenderId: 'lender-1',
      name: 'General',
      isDefault: true,
      createdAt: CREATED_AT,
    };

    const found = toPortfolio(
      row as unknown as Parameters<typeof toPortfolio>[0],
    );

    expect(found.id).toBe('portfolio-1');
    expect(found.lenderId).toBe('lender-1');
    expect(found.name).toBe('General');
    expect(found.isDefault).toBe(true);
    expect(found.createdAt).toBe(CREATED_AT);
  });
});
