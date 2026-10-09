import { describe, expect, it, vi } from 'vitest';
import { CreateLenderUseCase } from '@/modules/lenders/application/use-cases/create-lender.use-case.js';
import type { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-09-30T00:00:00Z');

function setup() {
  const saved: { lender: Lender; defaultPortfolioId: string }[] = [];
  const create = vi.fn((lender: Lender, defaultPortfolioId: string) => {
    saved.push({ lender, defaultPortfolioId });
    return Promise.resolve();
  });
  const lenders: LenderRepository = {
    create,
    countByTenant: vi.fn(),
    findById: vi.fn(() => Promise.resolve(null)),
    update: vi.fn(() => Promise.resolve()),
  };
  let nextId = 0;
  const ids: IdGenerator = { next: () => `id-${String(++nextId)}` };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new CreateLenderUseCase(lenders, ids, clock),
    create,
    saved,
  };
}

describe('CreateLenderUseCase', () => {
  it('crea al prestamista sin logo, con los días sin cobro por defecto y su cartera General', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
    });

    expect(created).toEqual({
      id: 'id-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      brandColor: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      defaultPortfolioId: 'id-2',
      createdAt: NOW,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.defaultPortfolioId).toBe('id-2');
  });

  it('recorta el nombre', async () => {
    const { useCase } = setup();

    const created = await useCase.execute({
      tenantId: 'tenant-1',
      name: '  Préstamos Ana  ',
    });

    expect(created.name).toBe('Préstamos Ana');
  });

  it('rechaza un nombre demasiado corto sin guardar nada', async () => {
    const { useCase, create } = setup();

    await expect(
      useCase.execute({ tenantId: 'tenant-1', name: 'A' }),
    ).rejects.toBeInstanceOf(InvalidLenderDataError);
    expect(create).not.toHaveBeenCalled();
  });
});
