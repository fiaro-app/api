import { describe, expect, it, vi } from 'vitest';
import { CreatePortfolioUseCase } from '@/modules/lenders/application/use-cases/create-portfolio.use-case.js';
import type { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import { Portfolio as PortfolioEntity } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import { PortfolioLimitReachedError } from '@/modules/lenders/domain/errors/portfolio-limit-reached.error.js';
import { InvalidPortfolioDataError } from '@/modules/lenders/domain/errors/invalid-portfolio-data.error.js';
import type { PortfolioRepository } from '@/modules/lenders/domain/repositories/portfolio.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-09-30T00:00:00Z');

function setup(existing: readonly Portfolio[] = []) {
  const saved: Portfolio[] = [];
  const create = vi.fn((portfolio: Portfolio) => {
    saved.push(portfolio);
    return Promise.resolve();
  });
  const portfolios: PortfolioRepository = {
    create,
    listByLender: vi.fn(() => Promise.resolve(existing)),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const ids: IdGenerator = { next: () => 'id-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new CreatePortfolioUseCase(portfolios, ids, clock),
    create,
    saved,
  };
}

describe('CreatePortfolioUseCase', () => {
  it('crea la cartera, siempre como no-default', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute({
      lenderId: 'lender-1',
      name: 'Zona Norte',
    });

    expect(created).toEqual({
      id: 'id-1',
      name: 'Zona Norte',
      isDefault: false,
      createdAt: NOW,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.lenderId).toBe('lender-1');
    expect(saved[0]?.isDefault).toBe(false);
  });

  it('recorta el nombre', async () => {
    const { useCase } = setup();

    const created = await useCase.execute({
      lenderId: 'lender-1',
      name: '  Zona Norte  ',
    });

    expect(created.name).toBe('Zona Norte');
  });

  it('rechaza un nombre demasiado corto sin guardar nada', async () => {
    const { useCase, create } = setup();

    await expect(
      useCase.execute({ lenderId: 'lender-1', name: 'A' }),
    ).rejects.toBeInstanceOf(InvalidPortfolioDataError);
    expect(create).not.toHaveBeenCalled();
  });

  it('no deja pasar de 4 carteras, la General incluida', async () => {
    const existing = ['General', 'Norte', 'Sur', 'Centro'].map((name, index) =>
      PortfolioEntity.create({
        id: `portfolio-${String(index)}`,
        lenderId: 'lender-1',
        name,
        isDefault: index === 0,
        createdAt: NOW,
      }),
    );
    const { useCase, create } = setup(existing);

    await expect(
      useCase.execute({ lenderId: 'lender-1', name: 'Oriente' }),
    ).rejects.toBeInstanceOf(PortfolioLimitReachedError);
    expect(create).not.toHaveBeenCalled();
  });

  it('deja crear la cuarta', async () => {
    const existing = ['General', 'Norte', 'Sur'].map((name, index) =>
      PortfolioEntity.create({
        id: `portfolio-${String(index)}`,
        lenderId: 'lender-1',
        name,
        isDefault: index === 0,
        createdAt: NOW,
      }),
    );
    const { useCase } = setup(existing);

    await expect(
      useCase.execute({ lenderId: 'lender-1', name: 'Centro' }),
    ).resolves.toMatchObject({ name: 'Centro' });
  });
});
