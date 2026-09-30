import { PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { RegisterOwnerUseCase } from '@/modules/tenants/application/use-cases/register-owner.use-case.js';
import { RegistrationController } from '@/modules/tenants/infrastructure/controllers/registration.controller.js';
import { IS_PUBLIC_KEY } from '@/shared/infrastructure/http/public.decorator.js';

const REGISTERED = {
  user: {
    id: 'user-1',
    phone: '+573001234567',
    fullName: 'Ana Pérez',
    contactEmail: null,
    nationalId: '1020304050',
    createdAt: new Date('2026-09-30T00:00:00Z'),
  },
  tenant: {
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
  },
};

function setup() {
  const registerOwnerUseCase = {
    execute: vi.fn(() => Promise.resolve(REGISTERED)),
  };
  const controller = new RegistrationController(
    registerOwnerUseCase as unknown as RegisterOwnerUseCase,
  );
  return { controller, registerOwnerUseCase };
}

describe('RegistrationController', () => {
  it('es pública (@Public()) y cuelga de /register', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, RegistrationController)).toBe(
      true,
    );
    expect(Reflect.getMetadata(PATH_METADATA, RegistrationController)).toBe(
      'register',
    );
  });

  describe('register', () => {
    it('registra la persona y el negocio', async () => {
      const { controller, registerOwnerUseCase } = setup();
      const body = {
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        password: 'una-contraseña-larga',
        nationalId: '1020304050',
        businessName: 'Préstamos Ana',
      };

      const response = await controller.register(body);

      expect(registerOwnerUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        body,
      );
      expect(response.user.id).toBe('user-1');
      expect(response.membership.roles).toEqual([
        'OWNER',
        'LENDER',
        'COLLECTOR',
      ]);
    });
  });
});
