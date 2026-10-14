import { describe, expect, it } from 'vitest';
import { GetLenderDashboardQuerySchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-requests.schema.js';

describe('GetLenderDashboardQuerySchema', () => {
  it('acepta que no llegue ningún parámetro: es solo hoy', () => {
    expect(GetLenderDashboardQuerySchema.parse({})).toEqual({});
  });

  it('acepta from y to juntos, incluso el mismo día', () => {
    expect(
      GetLenderDashboardQuerySchema.parse({
        from: '2026-10-01',
        to: '2026-10-09',
      }),
    ).toEqual({ from: '2026-10-01', to: '2026-10-09' });
    expect(
      GetLenderDashboardQuerySchema.safeParse({
        from: '2026-10-09',
        to: '2026-10-09',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['solo from', { from: '2026-10-01' }],
    ['solo to', { to: '2026-10-09' }],
    ['un rango al revés', { from: '2026-10-09', to: '2026-10-01' }],
    ['una fecha mal formada', { from: '09/10/2026', to: '2026-10-09' }],
    ['un campo que la ruta no declara', { day: '2026-10-09' }],
  ])('rechaza %s', (_name, query) => {
    expect(GetLenderDashboardQuerySchema.safeParse(query).success).toBe(false);
  });
});
