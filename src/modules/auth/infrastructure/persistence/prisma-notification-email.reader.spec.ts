import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import { PrismaNotificationEmailReader } from '@/modules/auth/infrastructure/persistence/prisma-notification-email.reader.js';

function setup(row: { contactEmail: string | null } | null) {
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(row),
  );
  const reader = new PrismaNotificationEmailReader({
    user: { findFirst },
  } as unknown as PrismaService);
  return { reader, findFirst };
}

describe('PrismaNotificationEmailReader', () => {
  it('pide solo un correo verificado de una cuenta activa', async () => {
    const { reader, findFirst } = setup({ contactEmail: 'ana@example.com' });

    await reader.findVerifiedContactEmail('user-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
        deactivatedAt: null,
        contactEmailVerified: true,
        contactEmail: { not: null },
      },
      select: { contactEmail: true },
    });
  });

  it('devuelve el correo que encontró', async () => {
    const { reader } = setup({ contactEmail: 'ana@example.com' });

    await expect(reader.findVerifiedContactEmail('user-1')).resolves.toBe(
      'ana@example.com',
    );
  });

  it('devuelve null si la persona no tiene un correo verificado ni activo', async () => {
    const { reader } = setup(null);

    await expect(reader.findVerifiedContactEmail('user-1')).resolves.toBeNull();
  });
});
