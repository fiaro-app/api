import { describe, expect, it, vi } from 'vitest';
import type { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { MembershipEntryAssembler } from '@/modules/memberships/application/services/membership-entry.assembler.js';
import { GetMembershipEntryUseCase } from '@/modules/memberships/application/use-cases/get-membership-entry.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

const MEMBERSHIP = Membership.create({
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: new Date('2026-09-30T00:00:00Z'),
  deactivatedAt: null,
});

function setup(found: Membership | null) {
  const findById = vi.fn(() => Promise.resolve(found));
  const memberships: MembershipRepository = {
    create: vi.fn(),
    findById,
    findActiveByUserId: vi.fn(),
    findActiveByLenderAndRoles: vi.fn(),
    countActiveByPortfolio: vi.fn(),
    findByLenderAndNationalId: vi.fn(),
    countCollectorSeats: vi.fn(),
    countAdminSeats: vi.fn(),
    hasHistory: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
  };
  const getUserById = {
    execute: vi.fn(() =>
      Promise.resolve({ fullName: 'Luis Gómez', phone: '+573109998877' }),
    ),
  } as unknown as GetUserByIdUseCase;
  return {
    useCase: new GetMembershipEntryUseCase(
      memberships,
      new MembershipEntryAssembler(getUserById),
    ),
    findById,
  };
}

describe('GetMembershipEntryUseCase', () => {
  it('devuelve la membresía con el nombre y el celular de la persona', async () => {
    const { useCase, findById } = setup(MEMBERSHIP);

    const entry = await useCase.execute('membership-1', 'lender-1');

    expect(findById).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      'lender-1',
    );
    expect(entry).toMatchObject({
      id: 'membership-1',
      fullName: 'Luis Gómez',
      phone: '+573109998877',
    });
  });

  it('lanza MembershipNotFoundError si no existe, o es de otro prestamista', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute('membership-1', 'lender-2'),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });
});
