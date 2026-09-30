import { describe, expect, it, vi } from 'vitest';
import { UpdateClientUseCase } from '@/modules/clients/application/use-cases/update-client.use-case.js';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';
import { ClientNotFoundError } from '@/modules/clients/domain/errors/client-not-found.error.js';
import { InvalidClientDataError } from '@/modules/clients/domain/errors/invalid-client-data.error.js';
import type { ClientRepository } from '@/modules/clients/domain/repositories/client.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const CURRENT = Client.create({
  id: 'client-1',
  lenderId: 'lender-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
  createdAt: CREATED_AT,
});

function setup(current: Client | null = CURRENT) {
  const saved: Client[] = [];
  const update = vi.fn((client: Client) => {
    saved.push(client);
    return Promise.resolve();
  });
  const clients: ClientRepository = {
    create: vi.fn(() => Promise.resolve()),
    findById: vi.fn(() => Promise.resolve(current)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    update,
  };
  return { useCase: new UpdateClientUseCase(clients), update, saved };
}

describe('UpdateClientUseCase', () => {
  it('cambia solo el campo que llega y conserva el resto', async () => {
    const { useCase, saved } = setup();

    const updated = await useCase.execute({
      clientId: 'client-1',
      lenderId: 'lender-1',
      address: 'Carrera 10 # 20-30, Bogotá',
    });

    expect(updated.address).toBe('Carrera 10 # 20-30, Bogotá');
    expect(updated.fullName).toBe('Carlos Andrés Gómez');
    expect(saved).toHaveLength(1);
  });

  it('busca el cliente actual dentro del prestamista de la sesión', async () => {
    const findById = vi.fn(() => Promise.resolve(CURRENT));
    const clients: ClientRepository = {
      create: vi.fn(() => Promise.resolve()),
      findById,
      list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
      update: vi.fn(() => Promise.resolve()),
    };
    const useCase = new UpdateClientUseCase(clients);

    await useCase.execute({
      clientId: 'client-1',
      lenderId: 'lender-1',
      fullName: 'Carlos Gómez',
    });

    expect(findById).toHaveBeenCalledExactlyOnceWith('client-1', 'lender-1');
  });

  it('rechaza datos que no cumplen el contrato sin guardar nada', async () => {
    const { useCase, update } = setup();

    await expect(
      useCase.execute({
        clientId: 'client-1',
        lenderId: 'lender-1',
        fullName: 'A',
      }),
    ).rejects.toBeInstanceOf(InvalidClientDataError);
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza ClientNotFoundError si no existe, o es de otro prestamista', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute({
        clientId: 'client-1',
        lenderId: 'lender-1',
        fullName: 'Nuevo nombre',
      }),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });
});
