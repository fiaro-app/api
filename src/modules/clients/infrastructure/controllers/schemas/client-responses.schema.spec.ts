import { describe, expect, it } from 'vitest';
import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import { toClientResponse } from '@/modules/clients/infrastructure/controllers/schemas/client-responses.schema.js';

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
