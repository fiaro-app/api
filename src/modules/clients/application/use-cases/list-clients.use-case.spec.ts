import { describe, expect, it, vi } from 'vitest';
import { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';
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
  const list = vi.fn(() => Promise.resolve({ items: [client], total: 1 }));
  const clients: ClientRepository = {
    create: vi.fn(() => Promise.resolve()),
    findById: vi.fn(() => Promise.resolve(null)),
    list,
    update: vi.fn(() => Promise.resolve()),
  };
  return { useCase: new ListClientsUseCase(clients), list };
}

describe('ListClientsUseCase', () => {
  it('devuelve la página de clientes, traducidos a sus datos públicos', async () => {
    const { useCase, list } = setup();

    const page = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      search: 'Gómez',
    });

    expect(list).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      search: 'Gómez',
    });
    expect(page).toEqual({
      items: [
        {
          id: 'client-1',
          nationalId: '1020304050',
          fullName: 'Carlos Andrés Gómez',
          occupation: 'Vendedor ambulante',
          phone: '+573001234567',
          address: 'Calle 45 # 12-30, Bogotá',
          createdAt: client.createdAt,
        },
      ],
      total: 1,
    });
  });
});
