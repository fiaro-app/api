import { describe, expect, it, vi } from 'vitest';
import type { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { MembershipEntryAssembler } from '@/modules/memberships/application/services/membership-entry.assembler.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

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

function setup(user: { fullName: string; phone: string } | null) {
  const execute = vi.fn(() => Promise.resolve(user));
  return {
    assembler: new MembershipEntryAssembler({
      execute,
    } as unknown as GetUserByIdUseCase),
    execute,
  };
}

describe('MembershipEntryAssembler', () => {
  it('suma el nombre y el celular de la persona a los datos de la membresía', async () => {
    const { assembler, execute } = setup({
      fullName: 'Luis Gómez',
      phone: '+573109998877',
    });

    const entry = await assembler.assemble(MEMBERSHIP);

    expect(execute).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(entry).toMatchObject({
      id: 'membership-1',
      userId: 'user-1',
      roles: ['COLLECTOR'],
      fullName: 'Luis Gómez',
      phone: '+573109998877',
    });
  });

  it('truena si la membresía no tiene persona: es una corrupción de datos, no un caso de negocio', async () => {
    const { assembler } = setup(null);

    await expect(assembler.assemble(MEMBERSHIP)).rejects.toThrow(
      'Membresía membership-1 sin persona (userId user-1).',
    );
  });
});
