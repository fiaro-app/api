import { describe, expect, it, vi } from 'vitest';
import { IsDaySettledUseCase } from '@/modules/settlements/application/use-cases/is-day-settled.use-case.js';

const check = (found: { status: string } | null) =>
  new IsDaySettledUseCase({
    findByCollectorAndDate: vi.fn(() => Promise.resolve(found)),
  } as never).execute('membership-1', '2026-10-15');

describe('IsDaySettledUseCase', () => {
  it('el día está cerrado con el cuadre en revisión o aprobado', async () => {
    await expect(check({ status: 'PENDING' })).resolves.toBe(true);
    await expect(check({ status: 'APPROVED' })).resolves.toBe(true);
  });

  it('sin cuadre, o con el cuadre rechazado, el cobrador puede seguir cobrando', async () => {
    await expect(check(null)).resolves.toBe(false);
    await expect(check({ status: 'REJECTED' })).resolves.toBe(false);
  });
});
