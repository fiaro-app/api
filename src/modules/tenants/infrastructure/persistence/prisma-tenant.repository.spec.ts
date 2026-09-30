import { describe, expect, it, vi } from 'vitest';
import { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';
import { PrismaTenantRepository } from '@/modules/tenants/infrastructure/persistence/prisma-tenant.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const tenant = Tenant.create({
  id: 'tenant-1',
  name: 'Préstamos Ana',
  createdAt: CREATED_AT,
});

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findUnique = vi.fn<(args: unknown) => Promise<unknown>>();
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const repository = new PrismaTenantRepository({
    tenant: { create, findUnique, findFirst },
  } as unknown as PrismaService);
  return { repository, create, findUnique, findFirst };
}

describe('PrismaTenantRepository.create', () => {
  it('guarda al Tenant', async () => {
    const { repository, create } = setup();

    await repository.create(tenant);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: { id: 'tenant-1', name: 'Préstamos Ana', createdAt: CREATED_AT },
    });
  });
});

describe('PrismaTenantRepository.findById', () => {
  it('devuelve al Tenant si existe', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce({
      id: 'tenant-1',
      name: 'Préstamos Ana',
      createdAt: CREATED_AT,
    });

    const found = await repository.findById('tenant-1');

    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'tenant-1' },
    });
    expect(found?.id).toBe('tenant-1');
  });

  it('devuelve null si no existe', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce(null);

    await expect(repository.findById('tenant-1')).resolves.toBeNull();
  });
});

describe('PrismaTenantRepository.findByName', () => {
  it('devuelve el primer Tenant con ese nombre', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce({
      id: 'tenant-1',
      name: 'Préstamos Ana',
      createdAt: CREATED_AT,
    });

    const found = await repository.findByName('Préstamos Ana');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { name: 'Préstamos Ana' },
    });
    expect(found?.id).toBe('tenant-1');
  });

  it('devuelve null si no hay ninguno con ese nombre', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(repository.findByName('Préstamos Ana')).resolves.toBeNull();
  });
});
