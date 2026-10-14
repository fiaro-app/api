import { describe, expect, it } from 'vitest';
import { ListClientsWithBalanceRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/client-list-requests.schema.js';
import { ListLoansWithBalanceRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/loan-list-requests.schema.js';

const ID = '01a0f387-97a7-7192-bc0f-4f9d34e0480f';

describe('ListLoansWithBalanceRequestSchema', () => {
  it('aplica los valores por defecto de paginación', () => {
    expect(ListLoansWithBalanceRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it('acepta filtros opcionales por cliente y por estado', () => {
    const parsed = ListLoansWithBalanceRequestSchema.parse({
      clientId: ID,
      status: 'ACTIVE',
    });
    expect(parsed.clientId).toBe(ID);
    expect(parsed.status).toBe('ACTIVE');
  });

  it.each([
    ['un campo que la ruta no declara', { sort: 'startDate' }],
    ['un cliente que no es UUID', { clientId: 'x' }],
    ['un estado desconocido', { status: 'LATE' }],
  ])('rechaza %s', (_name, body) => {
    expect(ListLoansWithBalanceRequestSchema.safeParse(body).success).toBe(
      false,
    );
  });
});

describe('ListClientsWithBalanceRequestSchema', () => {
  it('aplica los valores por defecto de paginación', () => {
    expect(ListClientsWithBalanceRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it('rechaza una búsqueda de más de 80 caracteres', () => {
    expect(
      ListClientsWithBalanceRequestSchema.safeParse({ search: 'a'.repeat(81) })
        .success,
    ).toBe(false);
    expect(
      ListClientsWithBalanceRequestSchema.safeParse({ search: 'a'.repeat(80) })
        .success,
    ).toBe(true);
  });

  it('acepta una búsqueda opcional y la recorta', () => {
    expect(
      ListClientsWithBalanceRequestSchema.parse({ search: '  Gómez ' }).search,
    ).toBe('Gómez');
  });

  it.each([
    ['un campo que la ruta no declara', { sort: 'name' }],
    ['una búsqueda vacía', { search: '   ' }],
  ])('rechaza %s', (_name, body) => {
    expect(ListClientsWithBalanceRequestSchema.safeParse(body).success).toBe(
      false,
    );
  });
});
