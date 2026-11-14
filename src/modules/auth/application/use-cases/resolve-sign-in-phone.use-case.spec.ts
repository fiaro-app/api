import { describe, expect, it, vi } from 'vitest';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';
import { ResolveSignInPhoneUseCase } from '@/modules/auth/application/use-cases/resolve-sign-in-phone.use-case.js';

const OWNER = User.create({
  id: 'u1',
  phone: MobilePhone.parse('+573001234567'),
  fullName: 'Ana',
  contactEmail: 'ana@example.com',
  contactEmailVerified: true,
  nationalId: null,
  mustChangePassword: false,
  createdAt: new Date(),
});

function build(found: User | null) {
  const findByVerifiedContactEmail = vi.fn().mockResolvedValue(found);
  const useCase = new ResolveSignInPhoneUseCase({
    findByVerifiedContactEmail,
  } as unknown as UserRepository);
  return { useCase, findByVerifiedContactEmail };
}

describe('ResolveSignInPhoneUseCase', () => {
  it('deja pasar un celular sin consultar', async () => {
    const { useCase, findByVerifiedContactEmail } = build(null);
    await expect(useCase.execute('+573001234567')).resolves.toBe(
      '+573001234567',
    );
    expect(findByVerifiedContactEmail).not.toHaveBeenCalled();
  });

  it('resuelve un correo verificado a su celular, en minúsculas', async () => {
    const { useCase, findByVerifiedContactEmail } = build(OWNER);
    await expect(useCase.execute('Ana@Example.com')).resolves.toBe(
      '+573001234567',
    );
    expect(findByVerifiedContactEmail).toHaveBeenCalledWith('ana@example.com');
  });

  it('resuelve un correo desconocido a un celular falso estable con forma de celular', async () => {
    const { useCase } = build(null);
    const first = await useCase.execute('nadie@example.com');
    expect(first).toMatch(/^\+573\d{9}$/);
    await expect(useCase.execute('NADIE@example.com')).resolves.toBe(first);
    await expect(useCase.execute('otro@example.com')).resolves.not.toBe(first);
  });
});
