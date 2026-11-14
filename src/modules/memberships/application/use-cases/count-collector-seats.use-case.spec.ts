import { describe, expect, it, vi } from 'vitest';
import { CountCollectorSeatsUseCase } from '@/modules/memberships/application/use-cases/count-collector-seats.use-case.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

describe('CountCollectorSeatsUseCase', () => {
  it('devuelve los cupos ocupados del prestamista', async () => {
    const countCollectorSeats = vi.fn(() => Promise.resolve(4));
    const useCase = new CountCollectorSeatsUseCase({
      countCollectorSeats,
    } as unknown as MembershipRepository);

    expect(await useCase.execute('lender-1')).toBe(4);
    expect(countCollectorSeats).toHaveBeenCalledExactlyOnceWith('lender-1');
  });
});
