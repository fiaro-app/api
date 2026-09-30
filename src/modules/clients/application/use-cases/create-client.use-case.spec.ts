import { describe, expect, it, vi } from 'vitest';
import { CreateClientUseCase } from '@/modules/clients/application/use-cases/create-client.use-case.js';
import type { Client } from '@/modules/clients/domain/entities/client.entity.js';
import { InvalidClientDataError } from '@/modules/clients/domain/errors/invalid-client-data.error.js';
import type { ClientRepository } from '@/modules/clients/domain/repositories/client.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-09-30T00:00:00Z');

const VALID_INPUT = {
  lenderId: 'lender-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
};

function setup() {
  const saved: Client[] = [];
  const create = vi.fn((client: Client) => {
    saved.push(client);
    return Promise.resolve();
  });
  const clients: ClientRepository = {
    create,
    findById: vi.fn(() => Promise.resolve(null)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    update: vi.fn(() => Promise.resolve()),
  };
  const ids: IdGenerator = { next: () => 'client-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new CreateClientUseCase(clients, ids, clock),
    create,
    saved,
  };
}

describe('CreateClientUseCase', () => {
  it('crea al cliente con la cédula normalizada', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute(VALID_INPUT);

    expect(created).toEqual({
      id: 'client-1',
      nationalId: '1020304050',
      fullName: 'Carlos Andrés Gómez',
      occupation: 'Vendedor ambulante',
      phone: '+573001234567',
      address: 'Calle 45 # 12-30, Bogotá',
      createdAt: NOW,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.lenderId).toBe('lender-1');
  });

  it('rechaza datos que no cumplen el contrato sin guardar nada', async () => {
    const { useCase, create } = setup();

    await expect(
      useCase.execute({ ...VALID_INPUT, fullName: 'A' }),
    ).rejects.toBeInstanceOf(InvalidClientDataError);
    expect(create).not.toHaveBeenCalled();
  });
});
