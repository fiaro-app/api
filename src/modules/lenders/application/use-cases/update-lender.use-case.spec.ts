import { describe, expect, it, vi } from 'vitest';
import { UpdateLenderUseCase } from '@/modules/lenders/application/use-cases/update-lender.use-case.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const CURRENT = Lender.create({
  id: 'lender-1',
  tenantId: 'tenant-1',
  name: 'Préstamos Ana',
  logoUrl: null,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  createdAt: CREATED_AT,
});

function setup(current: Lender | null = CURRENT) {
  const saved: Lender[] = [];
  const update = vi.fn((lender: Lender) => {
    saved.push(lender);
    return Promise.resolve();
  });
  const lenders: LenderRepository = {
    create: vi.fn(),
    findById: vi.fn(() => Promise.resolve(current)),
    update,
  };
  return { useCase: new UpdateLenderUseCase(lenders), update, saved };
}

describe('UpdateLenderUseCase', () => {
  it('cambia solo el campo que llega y conserva el resto', async () => {
    const { useCase, saved } = setup();

    const updated = await useCase.execute({
      lenderId: 'lender-1',
      name: 'Préstamos Ana Pérez',
    });

    expect(updated.name).toBe('Préstamos Ana Pérez');
    expect(updated.nonWorkingWeekdays).toEqual(['SUNDAY']);
    expect(saved).toHaveLength(1);
  });

  it('logoUrl: null lo quita', async () => {
    const withLogo = Lender.create({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: 'https://example.com/logo.png',
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt: CREATED_AT,
    });
    const { useCase } = setup(withLogo);

    const updated = await useCase.execute({
      lenderId: 'lender-1',
      logoUrl: null,
    });

    expect(updated.logoUrl).toBeNull();
  });

  it('sin logoUrl en el pedido no lo toca', async () => {
    const { useCase } = setup();

    const updated = await useCase.execute({
      lenderId: 'lender-1',
      skipNationalHolidays: true,
    });

    expect(updated.logoUrl).toBeNull();
    expect(updated.skipNationalHolidays).toBe(true);
  });

  it('rechaza un nombre demasiado corto sin guardar nada', async () => {
    const { useCase, update } = setup();

    await expect(
      useCase.execute({ lenderId: 'lender-1', name: 'A' }),
    ).rejects.toBeInstanceOf(InvalidLenderDataError);
    expect(update).not.toHaveBeenCalled();
  });

  it('si el prestamista no existe, es un error de programación', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute({ lenderId: 'lender-1', name: 'Nuevo nombre' }),
    ).rejects.toThrow('El prestamista lender-1 no existe.');
  });
});
