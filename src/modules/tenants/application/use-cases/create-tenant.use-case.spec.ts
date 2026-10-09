import { describe, expect, it, vi } from 'vitest';
import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import { CreateLenderUseCase } from '@/modules/lenders/application/use-cases/create-lender.use-case.js';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';
import { StartTrialSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/start-trial-subscription.use-case.js';
import type { CreatedMembership } from '@/modules/memberships/application/dtos/create-membership.dto.js';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
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
  brandColor: null,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  defaultPortfolioId: 'portfolio-1',
  createdAt: NOW,
};

const OWNER_MEMBERSHIP: CreatedMembership = {
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['OWNER', 'LENDER', 'COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: NOW,
};

function setup(options: { lenderError?: Error; membershipError?: Error } = {}) {
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
  const startTrialExecute = vi.fn(() => Promise.resolve());
  const startTrial = {
    execute: startTrialExecute,
  } as unknown as StartTrialSubscriptionUseCase;
  const createLenderExecute = vi.fn(() =>
    options.lenderError
      ? Promise.reject(options.lenderError)
      : Promise.resolve(CREATED_LENDER),
  );
  const createLender = {
    execute: createLenderExecute,
  } as unknown as CreateLenderUseCase;
  const createMembershipExecute = vi.fn(() =>
    options.membershipError
      ? Promise.reject(options.membershipError)
      : Promise.resolve(OWNER_MEMBERSHIP),
  );
  const createMembership = {
    execute: createMembershipExecute,
  } as unknown as CreateMembershipUseCase;
  const ids: IdGenerator = { next: () => 'tenant-1' };
  const clock: Clock = { now: () => NOW };
  const useCase = new CreateTenantUseCase(
    tenants,
    ids,
    clock,
    startTrial,
    createLender,
    createMembership,
  );
  return {
    useCase,
    create,
    startTrialExecute,
    createLenderExecute,
    createMembershipExecute,
    saved,
  };
}

describe('CreateTenantUseCase', () => {
  it('crea el Tenant, con su id el primer prestamista, y con el de ambos la membresía de dueño', async () => {
    const {
      useCase,
      startTrialExecute,
      createLenderExecute,
      createMembershipExecute,
      saved,
    } = setup();

    const created = await useCase.execute({
      businessName: 'Préstamos Ana',
      ownerUserId: 'user-1',
    });

    expect(created).toEqual({
      tenant: { id: 'tenant-1', name: 'Préstamos Ana', createdAt: NOW },
      lender: CREATED_LENDER,
      ownerMembership: OWNER_MEMBERSHIP,
    });
    expect(saved).toHaveLength(1);
    expect(startTrialExecute).toHaveBeenCalledExactlyOnceWith('tenant-1');
    expect(createLenderExecute).toHaveBeenCalledExactlyOnceWith({
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
    });
    expect(createMembershipExecute).toHaveBeenCalledExactlyOnceWith({
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      portfolioId: 'portfolio-1',
    });
  });

  it('recorta el nombre del Tenant', async () => {
    const { useCase } = setup();

    const created = await useCase.execute({
      businessName: '  Préstamos Ana  ',
      ownerUserId: 'user-1',
    });

    expect(created.tenant.name).toBe('Préstamos Ana');
  });

  it('rechaza un nombre demasiado corto sin guardar nada ni pedir el prestamista ni la membresía', async () => {
    const {
      useCase,
      create,
      startTrialExecute,
      createLenderExecute,
      createMembershipExecute,
    } = setup();

    await expect(
      useCase.execute({ businessName: 'A', ownerUserId: 'user-1' }),
    ).rejects.toBeInstanceOf(InvalidTenantDataError);
    expect(create).not.toHaveBeenCalled();
    expect(startTrialExecute).not.toHaveBeenCalled();
    expect(createLenderExecute).not.toHaveBeenCalled();
    expect(createMembershipExecute).not.toHaveBeenCalled();
  });

  it('deja pasar el error si el prestamista no se pudo crear, con el Tenant ya guardado', async () => {
    const { useCase, saved, createMembershipExecute } = setup({
      lenderError: new InvalidLenderDataError([]),
    });

    await expect(
      useCase.execute({ businessName: 'Préstamos Ana', ownerUserId: 'user-1' }),
    ).rejects.toBeInstanceOf(InvalidLenderDataError);
    expect(saved).toHaveLength(1);
    expect(createMembershipExecute).not.toHaveBeenCalled();
  });

  it('deja pasar el error si la membresía de dueño no se pudo crear, con el Tenant y el prestamista ya guardados', async () => {
    const { useCase, saved, createLenderExecute } = setup({
      membershipError: new Error('la base no respondió'),
    });

    await expect(
      useCase.execute({ businessName: 'Préstamos Ana', ownerUserId: 'user-1' }),
    ).rejects.toThrow('la base no respondió');
    expect(saved).toHaveLength(1);
    expect(createLenderExecute).toHaveBeenCalledOnce();
  });
});
