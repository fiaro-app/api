import { describe, expect, it, vi } from 'vitest';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { ListUserActiveMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-user-active-memberships.use-case.js';

describe('ListUserActiveMembershipsUseCase', () => {
  it('devuelve las membresías activas de la persona, una por negocio', async () => {
    const membership = Membership.create({
      id: 'm1',
      userId: 'u1',
      lenderId: 'l1',
      roles: ['OWNER'],
      status: 'ACTIVE',
      portfolioId: null,
      deactivatedAt: null,
      createdAt: new Date('2026-11-01T00:00:00Z'),
    });
    const findActiveByUserId = vi.fn(() => Promise.resolve([membership]));
    const useCase = new ListUserActiveMembershipsUseCase({
      findActiveByUserId,
    } as never);

    const result = await useCase.execute('u1');

    expect(findActiveByUserId).toHaveBeenCalledExactlyOnceWith('u1');
    expect(result).toEqual([
      expect.objectContaining({ id: 'm1', lenderId: 'l1', roles: ['OWNER'] }),
    ]);
  });
});
