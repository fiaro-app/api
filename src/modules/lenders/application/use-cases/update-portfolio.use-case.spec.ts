import { describe, expect, it, vi } from 'vitest';
import { UpdatePortfolioUseCase } from '@/modules/lenders/application/use-cases/update-portfolio.use-case.js';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import { InvalidPortfolioDataError } from '@/modules/lenders/domain/errors/invalid-portfolio-data.error.js';
import { PortfolioNameTakenError } from '@/modules/lenders/domain/errors/portfolio-name-taken.error.js';
import { PortfolioNotFoundError } from '@/modules/lenders/domain/errors/portfolio-not-found.error.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const NORTE = Portfolio.create({
  id: 'portfolio-1',
  lenderId: 'lender-1',
  name: 'Zona Norte',
  isDefault: false,
  createdAt: CREATED_AT,
});

function setup(found: Portfolio | null = NORTE) {
  const findById = vi.fn(() => Promise.resolve(found));
  const update = vi.fn<(portfolio: Portfolio) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const portfolios: PortfolioRepository = {
    create: vi.fn(),
    listByLender: vi.fn(),
    findById,
    update,
    delete: vi.fn(),
  };
  return { useCase: new UpdatePortfolioUseCase(portfolios), findById, update };
}

const INPUT = {
  lenderId: 'lender-1',
  portfolioId: 'portfolio-1',
  name: 'Zona Sur',
};

describe('UpdatePortfolioUseCase', () => {
  it('renombra la cartera y la devuelve con el nombre nuevo', async () => {
    const { useCase, findById, update } = setup();

    const renamed = await useCase.execute(INPUT);

    expect(findById).toHaveBeenCalledExactlyOnceWith('portfolio-1', 'lender-1');
    expect(update.mock.calls[0]?.[0].name).toBe('Zona Sur');
    expect(renamed).toEqual({
      id: 'portfolio-1',
      name: 'Zona Sur',
      isDefault: false,
      createdAt: CREATED_AT,
    });
  });

  it('recorta el nombre', async () => {
    const { useCase } = setup();

    const renamed = await useCase.execute({ ...INPUT, name: '  Zona Sur  ' });

    expect(renamed.name).toBe('Zona Sur');
  });

  it('rechaza un nombre inválido sin tocar la base de datos', async () => {
    const { useCase, findById } = setup();

    await expect(
      useCase.execute({ ...INPUT, name: '   ' }),
    ).rejects.toBeInstanceOf(InvalidPortfolioDataError);
    expect(findById).not.toHaveBeenCalled();
  });

  it('lanza PortfolioNotFoundError si no existe, o es de otro prestamista', async () => {
    const { useCase, update } = setup(null);

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      PortfolioNotFoundError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('deja pasar PortfolioNameTakenError si el nombre ya lo usa otra cartera', async () => {
    const { useCase, update } = setup();
    update.mockRejectedValueOnce(new PortfolioNameTakenError());

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      PortfolioNameTakenError,
    );
  });

  it('también deja renombrar la cartera por defecto', async () => {
    const general = Portfolio.create({
      id: 'portfolio-0',
      lenderId: 'lender-1',
      name: 'General',
      isDefault: true,
      createdAt: CREATED_AT,
    });
    const { useCase } = setup(general);

    const renamed = await useCase.execute({
      ...INPUT,
      portfolioId: 'portfolio-0',
    });

    expect(renamed).toMatchObject({ name: 'Zona Sur', isDefault: true });
  });
});
