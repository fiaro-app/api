import { describe, expect, it, vi } from 'vitest';
import { PrismaLegalAcceptanceRepository } from '@/modules/legal/infrastructure/persistence/prisma-legal-acceptance.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

describe('PrismaLegalAcceptanceRepository', () => {
  it('guarda todas las filas con un solo createMany', async () => {
    const createMany = vi.fn(() => Promise.resolve({ count: 1 }));
    const repository = new PrismaLegalAcceptanceRepository({
      legalAcceptance: { createMany },
    } as unknown as PrismaService);
    const row = {
      id: 'a',
      userId: 'u',
      document: 'TERMS' as const,
      version: 'v',
      ipAddress: null,
      userAgent: null,
    };

    await repository.recordMany([row]);

    expect(createMany).toHaveBeenCalledExactlyOnceWith({ data: [row] });
  });
});
