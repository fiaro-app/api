import { describe, expect, it } from 'vitest';
import {
  CreateClientRequestSchema,
  ListClientsRequestSchema,
  UpdateClientRequestSchema,
} from '@/modules/clients/infrastructure/controllers/schemas/client-requests.schema.js';

const VALID_BODY = {
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
};

describe('CreateClientRequestSchema', () => {
  it('acepta los cinco campos', () => {
    expect(CreateClientRequestSchema.safeParse(VALID_BODY).success).toBe(true);
  });

  it('rechaza un campo faltante', () => {
    const incomplete = {
      nationalId: VALID_BODY.nationalId,
      fullName: VALID_BODY.fullName,
      occupation: VALID_BODY.occupation,
      phone: VALID_BODY.phone,
    };
    expect(CreateClientRequestSchema.safeParse(incomplete).success).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      CreateClientRequestSchema.safeParse({ ...VALID_BODY, lenderId: 'x' })
        .success,
    ).toBe(false);
  });
});

describe('UpdateClientRequestSchema', () => {
  it('acepta un solo campo', () => {
    expect(
      UpdateClientRequestSchema.safeParse({ fullName: 'Carlos Gómez' }).success,
    ).toBe(true);
  });

  it('acepta los cinco campos juntos', () => {
    expect(UpdateClientRequestSchema.safeParse(VALID_BODY).success).toBe(true);
  });

  it('rechaza un cuerpo vacío: no hay nada que actualizar', () => {
    expect(UpdateClientRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(UpdateClientRequestSchema.safeParse({ cedula: 'x' }).success).toBe(
      false,
    );
  });
});

describe('ListClientsRequestSchema', () => {
  it('aplica los valores por defecto de paginación', () => {
    expect(ListClientsRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('acepta una búsqueda opcional', () => {
    expect(ListClientsRequestSchema.parse({ search: 'Gómez' }).search).toBe(
      'Gómez',
    );
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(ListClientsRequestSchema.safeParse({ sort: 'name' }).success).toBe(
      false,
    );
  });
});
