import { describe, expect, it, vi } from 'vitest';
import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import { CreateLenderUseCase } from '@/modules/lenders/application/use-cases/create-lender.use-case.js';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';
import { CreateTenantUseCase } from '@/modules/tenants/application/use-cases/create-tenant.use-case.js';
import type { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';
import { InvalidTenantDataError } from '@/modules/tenants/domain/errors/invalid-tenant-data.error.js';
import type { TenantRepository } from '@/modules/tenants/domain/repositories/tenant.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-09-30T00:00:00Z');

const CREATED_LENDER: CreatedLender = {
  id: 'lender-1',
  tenantId: 'tenant-1',
  name: 'Préstamos Ana',
  logoUrl: null,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  createdAt: NOW,
};

function setup(options: { lenderError?: Error } = {}) {
  const saved: Tenant[] = [];
  const create = vi.fn((tenant: Tenant) => {
    saved.push(tenant);
    return Promise.resolve();
  });
  const tenants: TenantRepository = {
    create,
    findById: vi.fn(() => Promise.resolve(null)),
    findByName: vi.fn(() => Promise.resolve(null)),
  };
  const createLenderExecute = vi.fn(() =>
    options.lenderError
      ? Promise.reject(options.lenderError)
      : Promise.resolve(CREATED_LENDER),
  );
  const createLender = {
    execute: createLenderExecute,
  } as unknown as CreateLenderUseCase;
  const ids: IdGenerator = { next: () => 'tenant-1' };
  const clock: Clock = { now: () => NOW };
  const useCase = new CreateTenantUseCase(tenants, ids, clock, createLender);
  return { useCase, create, createLenderExecute, saved };
}

describe('CreateTenantUseCase', () => {
  it('crea el Tenant y, con su id, el primer prestamista', async () => {
    const { useCase, createLenderExecute, saved } = setup();

    const created = await useCase.execute({ businessName: 'Préstamos Ana' });

    expect(created).toEqual({
      tenant: { id: 'tenant-1', name: 'Préstamos Ana', createdAt: NOW },
      lender: CREATED_LENDER,
    });
    expect(saved).toHaveLength(1);
    expect(createLenderExecute).toHaveBeenCalledExactlyOnceWith({
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
    });
  });

  it('recorta el nombre del Tenant', async () => {
    const { useCase } = setup();

    const created = await useCase.execute({
      businessName: '  Préstamos Ana  ',
    });

    expect(created.tenant.name).toBe('Préstamos Ana');
  });

  it('rechaza un nombre demasiado corto sin guardar nada ni pedir el prestamista', async () => {
    const { useCase, create, createLenderExecute } = setup();

    await expect(useCase.execute({ businessName: 'A' })).rejects.toBeInstanceOf(
      InvalidTenantDataError,
    );
    expect(create).not.toHaveBeenCalled();
    expect(createLenderExecute).not.toHaveBeenCalled();
  });

  it('deja pasar el error si el prestamista no se pudo crear, con el Tenant ya guardado', async () => {
    const { useCase, saved } = setup({
      lenderError: new InvalidLenderDataError([]),
    });

    await expect(
      useCase.execute({ businessName: 'Préstamos Ana' }),
    ).rejects.toBeInstanceOf(InvalidLenderDataError);
    expect(saved).toHaveLength(1);
  });
});
