import { describe, expect, it, vi } from 'vitest';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import { PrismaLenderRepository } from '@/modules/lenders/infrastructure/persistence/prisma-lender.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const lender = Lender.create({
  id: 'lender-1',
  tenantId: 'tenant-1',
  name: 'Préstamos Ana',
  logoUrl: null,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  createdAt: CREATED_AT,
});

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findUnique = vi.fn<(args: unknown) => Promise<unknown>>();
  const repository = new PrismaLenderRepository(
    { lender: { create, findUnique } } as unknown as PrismaService,
    { next: () => 'portfolio-1' },
  );
  return { repository, create, findUnique };
}

describe('PrismaLenderRepository.create', () => {
  it('guarda al prestamista con su cartera General por defecto', async () => {
    const { repository, create } = setup();

    await repository.create(lender);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'lender-1',
        tenantId: 'tenant-1',
        name: 'Préstamos Ana',
        logoUrl: null,
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
        createdAt: CREATED_AT,
        portfolios: {
          create: {
            id: 'portfolio-1',
            name: 'General',
            isDefault: true,
            createdAt: CREATED_AT,
          },
        },
      },
    });
  });
});

describe('PrismaLenderRepository.findById', () => {
  it('devuelve al prestamista si existe', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt: CREATED_AT,
    });

    const found = await repository.findById('lender-1');

    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'lender-1' },
    });
    expect(found?.id).toBe('lender-1');
  });

  it('devuelve null si no existe', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce(null);

    await expect(repository.findById('lender-1')).resolves.toBeNull();
  });
});
