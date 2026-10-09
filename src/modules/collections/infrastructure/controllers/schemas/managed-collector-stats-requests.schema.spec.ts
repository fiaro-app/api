import { describe, expect, it } from 'vitest';
import { GetManagedCollectorStatsQuerySchema } from '@/modules/collections/infrastructure/controllers/schemas/managed-collector-stats-requests.schema.js';

describe('GetManagedCollectorStatsQuerySchema', () => {
  it('acepta que no llegue ningún parámetro: el caso de uso usa el mes actual', () => {
    expect(GetManagedCollectorStatsQuerySchema.parse({})).toEqual({});
  });

  it('acepta from y to juntos, incluso el mismo día', () => {
    expect(
      GetManagedCollectorStatsQuerySchema.parse({
        from: '2026-10-01',
        to: '2026-10-01',
      }),
    ).toEqual({ from: '2026-10-01', to: '2026-10-01' });
  });

  it.each([
    ['un rango al revés', { from: '2026-10-09', to: '2026-10-01' }],
    ['solo from', { from: '2026-10-01' }],
    ['solo to', { to: '2026-10-09' }],
    ['una fecha mal formada', { from: '09/10/2026' }],
    ['un campo que la ruta no declara', { collectorId: 'x' }],
  ])('rechaza %s', (_name, query) => {
    expect(GetManagedCollectorStatsQuerySchema.safeParse(query).success).toBe(
      false,
    );
  });
});
