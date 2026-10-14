import { describe, expect, it } from 'vitest';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';
import {
  toClient,
  toClientCreateInput,
} from '@/modules/clients/infrastructure/persistence/client.mapper.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const client = Client.create({
  id: 'client-1',
  lenderId: 'lender-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
  createdAt: CREATED_AT,
});

describe('toClientCreateInput', () => {
  it('arma los datos de la fila de clients', () => {
    expect(toClientCreateInput(client)).toEqual({
      id: 'client-1',
      lenderId: 'lender-1',
      nationalId: '1020304050',
      fullName: 'Carlos Andrés Gómez',
      occupation: 'Vendedor ambulante',
      phone: '+573001234567',
      address: 'Calle 45 # 12-30, Bogotá',
      createdAt: CREATED_AT,
    });
  });
});

describe('toClient', () => {
  it('convierte la fila en la entidad de dominio', () => {
    const row = {
      id: 'client-1',
      lenderId: 'lender-1',
      nationalId: '1020304050',
      fullName: 'Carlos Andrés Gómez',
      occupation: 'Vendedor ambulante',
      phone: '+573001234567',
      address: 'Calle 45 # 12-30, Bogotá',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    };

    expect(toClient(row)).toEqual(client);
  });
});
