import { describe, expect, it } from 'vitest';
import { toCreatedUser } from '@/modules/auth/application/dtos/created-user.mapper.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

describe('toCreatedUser', () => {
  it('devuelve los datos de la persona con el celular como texto', () => {
    const createdAt = new Date('2026-09-23T17:00:00Z');
    const user = User.create({
      id: 'user-1',
      phone: MobilePhone.parse('+573001234567'),
      fullName: 'Ana Pérez',
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
      mustChangePassword: true,
      createdAt,
    });

    expect(toCreatedUser(user)).toEqual({
      id: 'user-1',
      phone: '+573001234567',
      fullName: 'Ana Pérez',
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
      mustChangePassword: true,
      createdAt,
    });
  });
});
