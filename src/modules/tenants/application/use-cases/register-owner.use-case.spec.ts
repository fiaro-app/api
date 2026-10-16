import { describe, expect, it, vi } from 'vitest';
import type { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import { RegisterOwnerUseCase } from '@/modules/tenants/application/use-cases/register-owner.use-case.js';
import type { RecordRegistrationAcceptancesUseCase } from '@/modules/legal/application/use-cases/record-registration-acceptances.use-case.js';
import type { CreateTenantUseCase } from '@/modules/tenants/application/use-cases/create-tenant.use-case.js';

const CREATED_USER = {
  id: 'user-1',
  phone: '+573001234567',
  fullName: 'Ana Pérez',
  contactEmail: null,
  contactEmailVerified: false,
  nationalId: '1020304050',
  mustChangePassword: false,
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

const CREATED_TENANT = {
  tenant: { id: 'tenant-1', name: 'Préstamos Ana', createdAt: new Date() },
  lender: {
    id: 'lender-1',
    tenantId: 'tenant-1',
    name: 'Préstamos Ana',
    logoUrl: null,
    nonWorkingWeekdays: ['SUNDAY'],
    skipNationalHolidays: false,
    defaultPortfolioId: 'portfolio-1',
    createdAt: new Date(),
  },
  ownerMembership: {
    id: 'membership-1',
    userId: 'user-1',
    lenderId: 'lender-1',
    roles: ['OWNER', 'LENDER', 'COLLECTOR'],
    status: 'ACTIVE' as const,
    portfolioId: 'portfolio-1',
    createdAt: new Date(),
  },
};

const INPUT = {
  phone: '+573001234567',
  fullName: 'Ana Pérez',
  password: 'una-contraseña-larga',
  nationalId: '1020304050',
  contactEmail: 'ana@example.com',
  businessName: 'Préstamos Ana',
  legal: {
    version: '2026-10-16',
    marketing: true,
    ipAddress: '10.0.0.1',
    userAgent: 'vitest',
  },
};

function setup() {
  const createUserUseCase = {
    execute: vi.fn(() => Promise.resolve(CREATED_USER)),
  };
  const createTenantUseCase = {
    execute: vi.fn(() => Promise.resolve(CREATED_TENANT)),
  };
  const acceptances = {
    assertCurrent: vi.fn(),
    execute: vi.fn(() => Promise.resolve()),
  };
  const useCase = new RegisterOwnerUseCase(
    createUserUseCase as unknown as CreateUserUseCase,
    createTenantUseCase as unknown as CreateTenantUseCase,
    acceptances as unknown as RecordRegistrationAcceptancesUseCase,
  );
  return { useCase, createUserUseCase, createTenantUseCase, acceptances };
}

describe('RegisterOwnerUseCase', () => {
  it('crea la persona y, con su id, el Tenant', async () => {
    const { useCase, createUserUseCase, createTenantUseCase } = setup();

    const registered = await useCase.execute(INPUT);

    expect(createUserUseCase.execute).toHaveBeenCalledExactlyOnceWith({
      phone: '+573001234567',
      fullName: 'Ana Pérez',
      password: 'una-contraseña-larga',
      nationalId: '1020304050',
      contactEmail: 'ana@example.com',
    });
    expect(createTenantUseCase.execute).toHaveBeenCalledExactlyOnceWith({
      businessName: 'Préstamos Ana',
      ownerUserId: 'user-1',
    });
    expect(registered).toEqual({ user: CREATED_USER, tenant: CREATED_TENANT });
  });

  it('propaga el error de la persona sin llegar a crear el Tenant', async () => {
    const { useCase, createUserUseCase, createTenantUseCase } = setup();
    const phoneTaken = new Error('celular ya registrado');
    createUserUseCase.execute.mockRejectedValueOnce(phoneTaken);

    await expect(useCase.execute(INPUT)).rejects.toBe(phoneTaken);
    expect(createTenantUseCase.execute).not.toHaveBeenCalled();
  });

  it('propaga el error del Tenant, con la persona ya creada', async () => {
    const { useCase, createTenantUseCase } = setup();
    const invalidName = new Error('nombre de negocio inválido');
    createTenantUseCase.execute.mockRejectedValueOnce(invalidName);

    await expect(useCase.execute(INPUT)).rejects.toBe(invalidName);
  });

  it('guarda lo que la persona aceptó, con su versión, IP y dispositivo, después de crear la cuenta', async () => {
    const { useCase, acceptances } = setup();

    await useCase.execute(INPUT);

    expect(acceptances.assertCurrent).toHaveBeenCalledExactlyOnceWith(
      '2026-10-16',
    );
    expect(acceptances.execute).toHaveBeenCalledExactlyOnceWith({
      userId: 'user-1',
      version: '2026-10-16',
      marketing: true,
      ipAddress: '10.0.0.1',
      userAgent: 'vitest',
    });
  });

  it('si los documentos cambiaron, no crea nada', async () => {
    const { useCase, acceptances, createUserUseCase } = setup();
    acceptances.assertCurrent.mockImplementation(() => {
      throw new Error('desactualizado');
    });

    await expect(useCase.execute(INPUT)).rejects.toThrow('desactualizado');
    expect(createUserUseCase.execute).not.toHaveBeenCalled();
  });
});
