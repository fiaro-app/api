import { describe, expect, it, vi } from 'vitest';
import { PrismaNotificationRecipientReader } from '@/modules/auth/infrastructure/persistence/prisma-notification-recipient.reader.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

function setup(
  row: { contactEmail: string | null; contactEmailVerified: boolean } | null,
) {
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(row),
  );
  const reader = new PrismaNotificationRecipientReader({
    user: { findFirst },
  } as unknown as PrismaService);
  return { reader, findFirst };
}

describe('PrismaNotificationRecipientReader', () => {
  it('lee solo cuentas activas, con su correo de contacto y si está verificado', async () => {
    const { reader, findFirst } = setup({
      contactEmail: 'ana@example.com',
      contactEmailVerified: true,
    });

    await reader.findRecipient('user-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', deactivatedAt: null },
      select: { contactEmail: true, contactEmailVerified: true },
    });
  });

  it('devuelve el correo verificado de una cuenta activa', async () => {
    const { reader } = setup({
      contactEmail: 'ana@example.com',
      contactEmailVerified: true,
    });

    await expect(reader.findRecipient('user-1')).resolves.toEqual({
      verifiedEmail: 'ana@example.com',
    });
  });

  it('no da correo si el que tiene no está verificado', async () => {
    const { reader } = setup({
      contactEmail: 'ana@example.com',
      contactEmailVerified: false,
    });

    await expect(reader.findRecipient('user-1')).resolves.toEqual({
      verifiedEmail: null,
    });
  });

  it('devuelve null si la cuenta no existe o está desactivada', async () => {
    const { reader } = setup(null);

    await expect(reader.findRecipient('user-1')).resolves.toBeNull();
  });
});
