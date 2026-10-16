import { describe, expect, it, vi } from 'vitest';
import {
  AdminSeats,
  occupiesAdminSeat,
} from '@/modules/memberships/application/services/admin-seats.js';
import { AdminLimitReachedError } from '@/modules/memberships/domain/errors/admin-limit-reached.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

function setup(max: number | null, used: number) {
  const countAdminSeats = vi.fn(() => Promise.resolve(used));
  const seats = new AdminSeats(
    { countAdminSeats } as unknown as MembershipRepository,
    {
      maxCollectors: () => Promise.resolve(null),
      maxAdmins: () => Promise.resolve(max),
    },
  );
  return { seats, countAdminSeats };
}

describe('occupiesAdminSeat', () => {
  it('administra quien tiene LENDER u OWNER; un cobrador no', () => {
    expect(occupiesAdminSeat(['LENDER'])).toBe(true);
    expect(occupiesAdminSeat(['OWNER', 'LENDER', 'COLLECTOR'])).toBe(true);
    expect(occupiesAdminSeat(['COLLECTOR'])).toBe(false);
  });
});

describe('AdminSeats', () => {
  it('deja pasar mientras quede un cupo', async () => {
    const { seats, countAdminSeats } = setup(3, 2);

    await expect(seats.assertAvailable('lender-1')).resolves.toBeUndefined();
    expect(countAdminSeats).toHaveBeenCalledWith('lender-1');
  });

  it('con todos los cupos ocupados lanza AdminLimitReachedError', async () => {
    await expect(
      setup(1, 1).seats.assertAvailable('lender-1'),
    ).rejects.toMatchObject({ params: { maxAdmins: 1 } });
    await expect(
      setup(1, 1).seats.assertAvailable('lender-1'),
    ).rejects.toBeInstanceOf(AdminLimitReachedError);
  });

  it('sin plan no hay tope y ni siquiera cuenta', async () => {
    const { seats, countAdminSeats } = setup(null, 99);

    await seats.assertAvailable('lender-1');

    expect(countAdminSeats).not.toHaveBeenCalled();
  });
});
