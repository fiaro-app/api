import { describe, expect, it, vi } from 'vitest';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';
import { ClientNotFoundError } from '@/modules/clients/domain/errors/client-not-found.error.js';
import type { ClientRepository } from '@/modules/clients/domain/repositories/client.repository.js';

const client = Client.create({
  id: 'client-1',
  lenderId: 'lender-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
  createdAt: new Date('2026-09-30T00:00:00Z'),
});

function setup() {
  const findById = vi.fn(() => Promise.resolve<Client | null>(null));
  const clients: ClientRepository = {
    create: vi.fn(() => Promise.resolve()),
    findById,
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    update: vi.fn(() => Promise.resolve()),
  };
  return { useCase: new GetClientUseCase(clients), findById };
}

describe('GetClientUseCase', () => {
  it('devuelve el cliente si existe para ese prestamista', async () => {
    const { useCase, findById } = setup();
    findById.mockResolvedValueOnce(client);

    const details = await useCase.execute('client-1', 'lender-1');

    expect(findById).toHaveBeenCalledExactlyOnceWith('client-1', 'lender-1');
    expect(details.id).toBe('client-1');
  });

  it('lanza ClientNotFoundError si no existe, o es de otro prestamista', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute('client-1', 'lender-1'),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });
});
