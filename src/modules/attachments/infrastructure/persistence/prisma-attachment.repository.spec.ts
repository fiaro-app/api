import { describe, expect, it, vi } from 'vitest';
import { PrismaAttachmentRepository } from '@/modules/attachments/infrastructure/persistence/prisma-attachment.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

function setup(existing: { key: string } | null = null) {
  const findUnique = vi.fn(() => Promise.resolve(existing));
  const upsert = vi.fn(() => Promise.resolve());
  const deleteMany = vi.fn(() => Promise.resolve({ count: 1 }));
  const model = { findUnique, upsert, deleteMany };
  const prisma = {
    attachment: model,
    $transaction: (work: (tx: { attachment: typeof model }) => unknown) =>
      Promise.resolve(work({ attachment: model })),
  } as unknown as PrismaService;
  return {
    repository: new PrismaAttachmentRepository(prisma),
    findUnique,
    upsert,
    deleteMany,
  };
}

const INPUT = {
  id: 'a1',
  lenderId: 'l1',
  kind: 'CLIENT_PHOTO' as const,
  ownerId: 'c1',
  key: 'nueva.jpg',
};

describe('PrismaAttachmentRepository', () => {
  it('findKey devuelve la llave o null', async () => {
    expect(
      await setup({ key: 'k.jpg' }).repository.findKey('CLIENT_PHOTO', 'c1'),
    ).toBe('k.jpg');
    expect(await setup().repository.findKey('CLIENT_PHOTO', 'c1')).toBeNull();
  });

  it('replace guarda la nueva y devuelve la anterior', async () => {
    const { repository, upsert } = setup({ key: 'vieja.jpg' });

    expect(await repository.replace(INPUT)).toBe('vieja.jpg');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { key: 'nueva.jpg' },
        where: { kind_ownerId: { kind: 'CLIENT_PHOTO', ownerId: 'c1' } },
      }),
    );
  });

  it('replace de la primera foto devuelve null', async () => {
    expect(await setup().repository.replace(INPUT)).toBeNull();
  });

  it('remove borra la fila y devuelve su llave; sin foto no borra nada', async () => {
    const withPhoto = setup({ key: 'k.jpg' });
    expect(await withPhoto.repository.remove('PAYMENT_PROOF', 'p1')).toBe(
      'k.jpg',
    );
    expect(withPhoto.deleteMany).toHaveBeenCalledWith({
      where: { kind: 'PAYMENT_PROOF', ownerId: 'p1' },
    });

    const without = setup();
    expect(await without.repository.remove('PAYMENT_PROOF', 'p1')).toBeNull();
    expect(without.deleteMany).not.toHaveBeenCalled();
  });
});
