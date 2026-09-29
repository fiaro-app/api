import { describe, expect, it } from 'vitest';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import {
  CREDENTIAL_PROVIDER,
  toUser,
  toUserCreateInput,
} from '@/modules/auth/infrastructure/persistence/user.mapper.js';

const CREATED_AT = new Date('2026-09-23T17:00:00Z');

const user = User.create({
  id: 'user-1',
  phone: MobilePhone.parse('+573001234567'),
  fullName: 'Ana Pérez',
  contactEmail: 'ana@example.com',
  nationalId: '1020304050',
  mustChangePassword: true,
  createdAt: CREATED_AT,
});

describe('toUserCreateInput', () => {
  it('convierte a la persona en la fila de users con su cuenta de credencial', () => {
    expect(toUserCreateInput(user, 'account-1', 'hash')).toEqual({
      id: 'user-1',
      fullName: 'Ana Pérez',
      phone: '+573001234567',
      loginEmail: '573001234567@phone.fiaro.invalid',
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
      mustChangePassword: true,
      createdAt: CREATED_AT,
      accounts: {
        create: {
          id: 'account-1',
          accountId: 'user-1',
          providerId: 'credential',
          password: 'hash',
          createdAt: CREATED_AT,
        },
      },
    });
  });

  it('el proveedor de la credencial es el que better-auth espera', () => {
    expect(CREDENTIAL_PROVIDER).toBe('credential');
  });
});

describe('toUser', () => {
  it('convierte la fila de users en la entidad de dominio', () => {
    const row = {
      id: 'user-1',
      fullName: 'Ana Pérez',
      phone: '+573001234567',
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
      mustChangePassword: true,
      createdAt: CREATED_AT,
    };

    const found = toUser(row as unknown as Parameters<typeof toUser>[0]);

    expect(found.id).toBe('user-1');
    expect(found.phone.value).toBe('+573001234567');
    expect(found.fullName).toBe('Ana Pérez');
    expect(found.contactEmail).toBe('ana@example.com');
    expect(found.nationalId).toBe('1020304050');
    expect(found.mustChangePassword).toBe(true);
    expect(found.createdAt).toBe(CREATED_AT);
  });
});
