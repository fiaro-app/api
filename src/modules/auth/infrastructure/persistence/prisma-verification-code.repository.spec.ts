import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { PrismaVerificationCodeRepository } from '@/modules/auth/infrastructure/persistence/prisma-verification-code.repository.js';

function setup() {
  const deleteMany = vi.fn<(args: unknown) => unknown>(() => 'deleteMany-op');
  const create = vi.fn<(args: unknown) => unknown>(() => 'create-op');
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const transaction = vi.fn<(ops: unknown[]) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const repository = new PrismaVerificationCodeRepository(
    {
      verification: { deleteMany, create, findFirst },
      $transaction: transaction,
    } as unknown as PrismaService,
    { next: () => 'verification-1' },
  );
  return { repository, deleteMany, create, findFirst, transaction };
}

describe('PrismaVerificationCodeRepository.replace', () => {
  it('borra cualquier código pendiente y crea el nuevo en una sola transacción', async () => {
    const { repository, deleteMany, create, transaction } = setup();
    const expiresAt = new Date('2026-09-28T18:00:00Z');

    await repository.replace(
      'password-reset:user-1',
      'hash-del-codigo',
      expiresAt,
    );

    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { identifier: 'password-reset:user-1' },
    });
    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'verification-1',
        identifier: 'password-reset:user-1',
        value: 'hash-del-codigo',
        expiresAt,
      },
    });
    expect(transaction).toHaveBeenCalledExactlyOnceWith([
      'deleteMany-op',
      'create-op',
    ]);
  });
});

describe('PrismaVerificationCodeRepository.find', () => {
  it('busca la más reciente con ese identificador y la convierte', async () => {
    const { repository, findFirst } = setup();
    const expiresAt = new Date('2026-09-28T18:00:00Z');
    findFirst.mockResolvedValueOnce({ value: 'hash-del-codigo', expiresAt });

    const found = await repository.find('password-reset:user-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { identifier: 'password-reset:user-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(found).toEqual({ hashedValue: 'hash-del-codigo', expiresAt });
  });

  it('sin un código pendiente, devuelve null', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(repository.find('password-reset:user-1')).resolves.toBeNull();
  });
});

describe('PrismaVerificationCodeRepository.delete', () => {
  it('borra el código de ese identificador', async () => {
    const { repository, deleteMany } = setup();

    await repository.delete('password-reset:user-1');

    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { identifier: 'password-reset:user-1' },
    });
  });
});
