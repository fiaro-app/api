import { describe, expect, it, vi } from 'vitest';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function setup(found: Membership | null) {
  const findById = vi.fn(() => Promise.resolve(found));
  const memberships: MembershipRepository = {
    create: vi.fn(),
    findById,
    findActiveByUserId: vi.fn(),
    findActiveByLenderAndRoles: vi.fn(),
    update: vi.fn(),
  };
  return { useCase: new GetMembershipUseCase(memberships), findById };
}

describe('GetMembershipUseCase', () => {
  it('devuelve los datos públicos de la membresía', async () => {
    const membership = Membership.create({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
      deactivatedAt: null,
    });
    const { useCase, findById } = setup(membership);

    const found = await useCase.execute('membership-1', 'lender-1');

    expect(findById).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      'lender-1',
    );
    expect(found.roles).toEqual(['COLLECTOR']);
  });

  it('si no existe para ese prestamista, lanza MembershipNotFoundError', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute('membership-1', 'lender-1'),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });
});
