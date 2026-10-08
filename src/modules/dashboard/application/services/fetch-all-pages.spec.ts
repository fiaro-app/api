import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';

describe('fetchAllPages', () => {
  it('con todo en la primera página, no pide una segunda', async () => {
    const fetchPage = vi.fn(() =>
      Promise.resolve({ items: ['a', 'b'], total: 2 }),
    );

    const result = await fetchAllPages(10, fetchPage);

    expect(result).toEqual(['a', 'b']);
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it('con una lista vacía, no pide una segunda página', async () => {
    const fetchPage = vi.fn(() => Promise.resolve({ items: [], total: 0 }));

    expect(await fetchAllPages(10, fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it('pide el resto de páginas en paralelo cuando faltan', async () => {
    const fetchPage = vi.fn((page: number) =>
      Promise.resolve({
        items: page === 1 ? ['a', 'b'] : page === 2 ? ['c', 'd'] : ['e'],
        total: 5,
      }),
    );

    const result = await fetchAllPages(2, fetchPage);

    expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenCalledWith(1);
    expect(fetchPage).toHaveBeenCalledWith(2);
    expect(fetchPage).toHaveBeenCalledWith(3);
  });
});
