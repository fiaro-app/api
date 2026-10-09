import { describe, expect, it, vi } from 'vitest';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function setup(found: Lender | null) {
  const findById = vi.fn(() => Promise.resolve(found));
  const lenders: LenderRepository = {
    create: vi.fn(),
    countByTenant: vi.fn(),
    findById,
    update: vi.fn(),
  };
  return { useCase: new GetLenderUseCase(lenders), findById };
}

describe('GetLenderUseCase', () => {
  it('devuelve los datos públicos del prestamista', async () => {
    const lender = Lender.create({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      brandColor: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt: CREATED_AT,
    });
    const { useCase, findById } = setup(lender);

    const details = await useCase.execute('lender-1');

    expect(findById).toHaveBeenCalledExactlyOnceWith('lender-1');
    expect(details.name).toBe('Préstamos Ana');
  });

  it('si el prestamista no existe, es un error de programación', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute('lender-1')).rejects.toThrow(
      'El prestamista lender-1 no existe.',
    );
  });
});
