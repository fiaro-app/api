import { describe, expect, it } from 'vitest';
import { GetCollectorRouteRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-route-requests.schema.js';

describe('GetCollectorRouteRequestSchema', () => {
  it('acepta un cuerpo vacío', () => {
    expect(GetCollectorRouteRequestSchema.parse({})).toEqual({});
  });

  it('acepta una fecha', () => {
    expect(
      GetCollectorRouteRequestSchema.parse({ date: '2026-10-02' }),
    ).toEqual({ date: '2026-10-02' });
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(
      GetCollectorRouteRequestSchema.safeParse({ date: '02-10-2026' }).success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      GetCollectorRouteRequestSchema.safeParse({ collectorId: 'x' }).success,
    ).toBe(false);
  });
});
