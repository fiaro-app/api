import { describe, expect, it, vi } from 'vitest';
import { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import { PrismaLeadRepository } from '@/modules/leads/infrastructure/persistence/prisma-lead.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

describe('PrismaLeadRepository.create', () => {
  it('guarda el contacto con todos sus campos', async () => {
    const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
      Promise.resolve(),
    );
    const repository = new PrismaLeadRepository({
      lead: { create },
    } as unknown as PrismaService);
    const createdAt = new Date('2026-10-09T12:00:00Z');

    await repository.create(
      Lead.create({
        id: 'lead-1',
        name: 'Ana Pérez',
        phone: '+573001234567',
        email: null,
        message: 'Quiero probar Fiaro.',
        createdAt,
      }),
    );

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'lead-1',
        name: 'Ana Pérez',
        phone: '+573001234567',
        email: null,
        message: 'Quiero probar Fiaro.',
        createdAt,
      },
    });
  });
});
