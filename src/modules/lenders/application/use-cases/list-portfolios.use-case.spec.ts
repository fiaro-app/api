import { describe, expect, it, vi } from 'vitest';
import { ListPortfoliosUseCase } from '@/modules/lenders/application/use-cases/list-portfolios.use-case.js';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function setup(found: readonly Portfolio[]) {
  const listByLender = vi.fn(() => Promise.resolve(found));
  const portfolios: PortfolioRepository = {
    create: vi.fn(),
    listByLender,
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { useCase: new ListPortfoliosUseCase(portfolios), listByLender };
}

describe('ListPortfoliosUseCase', () => {
  it('devuelve los datos públicos de cada cartera del prestamista', async () => {
    const general = Portfolio.create({
      id: 'portfolio-1',
      lenderId: 'lender-1',
      name: 'General',
      isDefault: true,
      createdAt: CREATED_AT,
    });
    const { useCase, listByLender } = setup([general]);

    const found = await useCase.execute('lender-1');

    expect(listByLender).toHaveBeenCalledExactlyOnceWith('lender-1');
    expect(found).toEqual([
      {
        id: 'portfolio-1',
        name: 'General',
        isDefault: true,
        createdAt: CREATED_AT,
      },
    ]);
  });

  it('devuelve una lista vacía si el prestamista no tiene carteras', async () => {
    const { useCase } = setup([]);

    expect(await useCase.execute('lender-1')).toEqual([]);
  });
});
