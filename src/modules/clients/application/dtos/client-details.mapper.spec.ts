import { describe, expect, it } from 'vitest';
import { toClientDetails } from '@/modules/clients/application/dtos/client-details.mapper.js';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';

describe('toClientDetails', () => {
  it('devuelve los datos públicos del cliente, sin el lenderId', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const client = Client.create({
      id: 'client-1',
      lenderId: 'lender-1',
      nationalId: '1020304050',
      fullName: 'Carlos Andrés Gómez',
      occupation: 'Vendedor ambulante',
      phone: '+573001234567',
      address: 'Calle 45 # 12-30, Bogotá',
      createdAt,
    });

    expect(toClientDetails(client)).toEqual({
      id: 'client-1',
      nationalId: '1020304050',
      fullName: 'Carlos Andrés Gómez',
      occupation: 'Vendedor ambulante',
      phone: '+573001234567',
      address: 'Calle 45 # 12-30, Bogotá',
      createdAt,
    });
  });
});
