import { describe, expect, it, vi } from 'vitest';
import type { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { MembershipEntryAssembler } from '@/modules/memberships/application/services/membership-entry.assembler.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const MEMBERSHIP = Membership.create({
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
});

function setup(
  page: { items: readonly Membership[]; total: number },
  user: { fullName: string; phone: string } | null = {
    fullName: 'Luis Gómez',
    phone: '+573109998877',
  },
) {
  const list = vi.fn(() => Promise.resolve(page));
  const memberships: MembershipRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findActiveByUserId: vi.fn(),
    findActiveByLenderAndRoles: vi.fn(),
    countActiveByPortfolio: vi.fn(),
    findByLenderAndNationalId: vi.fn(),
    countCollectorSeats: vi.fn(),
    countAdminSeats: vi.fn(),
    hasHistory: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    list,
  };
  const execute = vi.fn(() => Promise.resolve(user));
  const getUserById = { execute } as unknown as GetUserByIdUseCase;
  return {
    useCase: new ListMembershipsUseCase(
      memberships,
      new MembershipEntryAssembler(getUserById),
    ),
    list,
    getUserById: execute,
  };
}

describe('ListMembershipsUseCase', () => {
  it('enriquece cada membresía con el nombre y el celular de su persona', async () => {
    const { useCase, getUserById } = setup({ items: [MEMBERSHIP], total: 1 });

    const page = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
    });

    expect(getUserById).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(page).toEqual({
      items: [
        {
          id: 'membership-1',
          userId: 'user-1',
          lenderId: 'lender-1',
          roles: ['COLLECTOR'],
          status: 'ACTIVE',
          portfolioId: 'portfolio-1',
          createdAt: CREATED_AT,
          deactivatedAt: null,
          fullName: 'Luis Gómez',
          phone: '+573109998877',
        },
      ],
      total: 1,
    });
  });

  it('pasa la paginación y los filtros al repositorio tal cual', async () => {
    const { useCase, list } = setup({ items: [], total: 0 });

    await useCase.execute({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 10,
      status: 'ACTIVE',
      role: 'COLLECTOR',
    });

    expect(list).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 10,
      status: 'ACTIVE',
      role: 'COLLECTOR',
    });
  });

  it('truena si la persona de una membresía no existe (corrupción de datos, no caso de negocio)', async () => {
    const { useCase } = setup({ items: [MEMBERSHIP], total: 1 }, null);

    await expect(
      useCase.execute({ lenderId: 'lender-1', page: 1, pageSize: 20 }),
    ).rejects.toThrow(/membership-1/);
  });
});
