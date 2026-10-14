import { describe, expect, it } from 'vitest';
import { SearchCollectionVisitsRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-report-requests.schema.js';

const ID = '01a0f387-97a7-7192-bc0f-4f9d34e0480f';

describe('SearchCollectionVisitsRequestSchema', () => {
  it('aplica la paginación por defecto y no exige ningún filtro', () => {
    expect(SearchCollectionVisitsRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it('acepta el rango y los tres filtros combinados', () => {
    const parsed = SearchCollectionVisitsRequestSchema.parse({
      dateRange: { from: '2026-10-01', to: '2026-10-09' },
      collectorMembershipId: ID,
      portfolioId: ID,
      outcome: 'REFUSED',
    });
    expect(parsed.outcome).toBe('REFUSED');
    expect(parsed.dateRange?.to).toBe('2026-10-09');
  });

  it.each([
    [
      'un rango al revés',
      { dateRange: { from: '2026-10-09', to: '2026-10-01' } },
    ],
    ['un resultado desconocido', { outcome: 'LATE' }],
    ['un cobrador que no es UUID', { collectorMembershipId: 'x' }],
    ['una cartera que no es UUID', { portfolioId: 'x' }],
    ['un campo que la ruta no declara', { sort: 'amount' }],
    ['una página mayor al máximo', { pageSize: 101 }],
  ])('rechaza %s', (_name, body) => {
    expect(SearchCollectionVisitsRequestSchema.safeParse(body).success).toBe(
      false,
    );
  });
});
