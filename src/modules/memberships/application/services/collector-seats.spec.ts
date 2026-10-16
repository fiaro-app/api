import { describe, expect, it, vi } from 'vitest';
import {
  CollectorSeats,
  occupiesCollectorSeat,
} from '@/modules/memberships/application/services/collector-seats.js';
import { CollectorLimitReachedError } from '@/modules/memberships/domain/errors/collector-limit-reached.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

function setup(max: number | null, used: number) {
  const countCollectorSeats = vi.fn(() => Promise.resolve(used));
  const seats = new CollectorSeats(
    { countCollectorSeats } as unknown as MembershipRepository,
    {
      maxCollectors: () => Promise.resolve(max),
      maxAdmins: () => Promise.resolve(null),
    },
  );
  return { seats, countCollectorSeats };
}

describe('occupiesCollectorSeat', () => {
  it('solo un cobrador que no es el dueño ocupa cupo', () => {
    expect(occupiesCollectorSeat(['COLLECTOR'])).toBe(true);
    expect(occupiesCollectorSeat(['LENDER', 'COLLECTOR'])).toBe(true);
    expect(occupiesCollectorSeat(['OWNER', 'LENDER', 'COLLECTOR'])).toBe(false);
    expect(occupiesCollectorSeat(['LENDER'])).toBe(false);
  });
});

describe('CollectorSeats.assertAvailable', () => {
  it('deja pasar mientras quede al menos un cupo', async () => {
    await expect(
      setup(5, 4).seats.assertAvailable('lender-1'),
    ).resolves.toBeUndefined();
  });

  it('rechaza con el tope del plan cuando ya están todos ocupados', async () => {
    const error = await setup(5, 5)
      .seats.assertAvailable('lender-1')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CollectorLimitReachedError);
    expect((error as CollectorLimitReachedError).params).toEqual({
      maxCollectors: 5,
    });
  });

  it('sin suscripción no hay tope y ni siquiera cuenta', async () => {
    const { seats, countCollectorSeats } = setup(null, 99);

    await seats.assertAvailable('lender-1');

    expect(countCollectorSeats).not.toHaveBeenCalled();
  });
});
