import { describe, expect, it } from 'vitest';
import { cacheKey } from '@/shared/infrastructure/cache/cache-key.js';

describe('cacheKey', () => {
  it('no depende del orden de las propiedades ni de los undefined', () => {
    expect(
      cacheKey('stats', { a: 1, b: { y: 2, x: [1, { q: 1, p: 2 }] } }),
    ).toBe(
      cacheKey('stats', {
        b: { x: [1, { p: 2, q: 1 }], y: 2 },
        a: 1,
        c: undefined,
      }),
    );
  });

  it('cambia con el recurso, los filtros y la página', () => {
    const base = cacheKey('loans', { page: 1, pageSize: 10 });
    expect(base.startsWith('loans:')).toBe(true);
    expect(cacheKey('clients', { page: 1, pageSize: 10 })).not.toBe(base);
    expect(cacheKey('loans', { page: 2, pageSize: 10 })).not.toBe(base);
    expect(
      cacheKey('loans', { page: 1, pageSize: 10, status: 'ACTIVE' }),
    ).not.toBe(base);
    expect(cacheKey('loans')).toBe(cacheKey('loans', {}));
  });
});
