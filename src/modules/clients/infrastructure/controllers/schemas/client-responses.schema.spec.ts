import { describe, expect, it } from 'vitest';
import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import {
  toClientResponse,
  toClientsPageResponse,
} from '@/modules/clients/infrastructure/controllers/schemas/client-responses.schema.js';

const DETAILS: ClientDetails = {
  id: 'client-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

describe('toClientResponse', () => {
  it('convierte la fecha a texto ISO', () => {
    expect(toClientResponse(DETAILS)).toEqual({
      id: 'client-1',
      nationalId: '1020304050',
      fullName: 'Carlos Andrés Gómez',
      occupation: 'Vendedor ambulante',
      phone: '+573001234567',
      address: 'Calle 45 # 12-30, Bogotá',
      createdAt: '2026-09-30T00:00:00.000Z',
    });
  });
});

describe('toClientsPageResponse', () => {
  it('envuelve los clientes con sus metadatos de paginación', () => {
    expect(
      toClientsPageResponse(
        { items: [DETAILS], total: 1 },
        { page: 1, pageSize: 20 },
      ),
    ).toEqual({
      data: [toClientResponse(DETAILS)],
      meta: { page: 1, pageSize: 20, total: 1 },
    });
  });
});
