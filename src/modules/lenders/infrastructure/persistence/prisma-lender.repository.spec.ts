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
  brandColor: null,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  createdAt: CREATED_AT,
});

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findUnique = vi.fn<(args: unknown) => Promise<unknown>>();
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const repository = new PrismaLenderRepository({
    lender: { create, findUnique, update },
  } as unknown as PrismaService);
  return { repository, create, findUnique, update };
}

describe('PrismaLenderRepository.create', () => {
  it('guarda al prestamista con su cartera General por defecto', async () => {
    const { repository, create } = setup();

    await repository.create(lender, 'portfolio-1');

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'lender-1',
        tenantId: 'tenant-1',
        name: 'Préstamos Ana',
        logoUrl: null,
        brandColor: null,
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
      brandColor: null,
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

describe('PrismaLenderRepository.update', () => {
  it('actualiza al prestamista', async () => {
    const { repository, update } = setup();

    await repository.update(lender);

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'lender-1' },
      data: {
        name: 'Préstamos Ana',
        logoUrl: null,
        brandColor: null,
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
      },
    });
  });
});
