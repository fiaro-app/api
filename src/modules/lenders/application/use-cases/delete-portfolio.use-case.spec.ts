import { describe, expect, it, vi } from 'vitest';
import { DeletePortfolioUseCase } from '@/modules/lenders/application/use-cases/delete-portfolio.use-case.js';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import { PortfolioNotDeletableError } from '@/modules/lenders/domain/errors/portfolio-not-deletable.error.js';
import { PortfolioNotFoundError } from '@/modules/lenders/domain/errors/portfolio-not-found.error.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';
import type { CountActiveMembershipsByPortfolioUseCase } from '@/modules/memberships/application/use-cases/count-active-memberships-by-portfolio.use-case.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const portfolioOf = (isDefault: boolean) =>
  Portfolio.create({
    id: 'portfolio-1',
    lenderId: 'lender-1',
    name: isDefault ? 'General' : 'Zona Norte',
    isDefault,
    createdAt: CREATED_AT,
  });

function setup(found: Portfolio | null, activeMemberships = 0) {
  const findById = vi.fn(() => Promise.resolve(found));
  const deleteFn = vi.fn(() => Promise.resolve());
  const portfolios: PortfolioRepository = {
    create: vi.fn(),
    listByLender: vi.fn(),
    findById,
    update: vi.fn(),
    delete: deleteFn,
  };
  const count = vi.fn(() => Promise.resolve(activeMemberships));
  return {
    useCase: new DeletePortfolioUseCase(portfolios, {
      execute: count,
    } as unknown as CountActiveMembershipsByPortfolioUseCase),
    findById,
    deleteFn,
    count,
  };
}

describe('DeletePortfolioUseCase', () => {
  it('borra una cartera que no es la por defecto y no tiene cobradores activos', async () => {
    const { useCase, deleteFn, count } = setup(portfolioOf(false));

    await useCase.execute('portfolio-1', 'lender-1');

    expect(count).toHaveBeenCalledExactlyOnceWith('portfolio-1', 'lender-1');
    expect(deleteFn).toHaveBeenCalledExactlyOnceWith('portfolio-1', 'lender-1');
  });

  it('lanza PortfolioNotFoundError si no existe, o es de otro prestamista', async () => {
    const { useCase, deleteFn } = setup(null);

    await expect(
      useCase.execute('portfolio-1', 'lender-1'),
    ).rejects.toBeInstanceOf(PortfolioNotFoundError);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('no deja borrar la cartera por defecto, ni siquiera vacía', async () => {
    const { useCase, deleteFn, count } = setup(portfolioOf(true));

    await expect(
      useCase.execute('portfolio-1', 'lender-1'),
    ).rejects.toBeInstanceOf(PortfolioNotDeletableError);
    expect(count).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('no deja borrar una cartera con cobradores activos asignados', async () => {
    const { useCase, deleteFn } = setup(portfolioOf(false), 2);

    await expect(useCase.execute('portfolio-1', 'lender-1')).rejects.toThrow(
      /2 colaborador/,
    );
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
