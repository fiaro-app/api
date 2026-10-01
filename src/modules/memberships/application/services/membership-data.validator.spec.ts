import { describe, expect, it } from 'vitest';
import { validateMembershipData } from '@/modules/memberships/application/services/membership-data.validator.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';

describe('validateMembershipData', () => {
  it('acepta roles sin COLLECTOR y sin cartera', () => {
    expect(validateMembershipData({ roles: ['OWNER', 'LENDER'] })).toEqual({
      roles: ['OWNER', 'LENDER'],
      portfolioId: null,
    });
  });

  it('acepta COLLECTOR con cartera', () => {
    expect(
      validateMembershipData({
        roles: ['COLLECTOR'],
        portfolioId: 'portfolio-1',
      }),
    ).toEqual({ roles: ['COLLECTOR'], portfolioId: 'portfolio-1' });
  });

  it('ignora una cartera que llega sin COLLECTOR en los roles', () => {
    expect(
      validateMembershipData({ roles: ['LENDER'], portfolioId: 'portfolio-1' }),
    ).toEqual({ roles: ['LENDER'], portfolioId: null });
  });

  it('rechaza una lista de roles vacía', () => {
    let error: unknown;
    try {
      validateMembershipData({ roles: [] });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidMembershipDataError);
    expect((error as InvalidMembershipDataError).issues[0]?.path).toEqual([
      'roles',
    ]);
  });

  it('rechaza roles repetidos', () => {
    let error: unknown;
    try {
      validateMembershipData({ roles: ['LENDER', 'LENDER'] });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidMembershipDataError);
  });

  it('rechaza un rol que no existe', () => {
    let error: unknown;
    try {
      validateMembershipData({ roles: ['LENDER', 'ADMIN' as never] });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidMembershipDataError);
  });

  it('rechaza COLLECTOR sin cartera', () => {
    let error: unknown;
    try {
      validateMembershipData({ roles: ['COLLECTOR'] });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidMembershipDataError);
    expect((error as InvalidMembershipDataError).issues[0]?.path).toEqual([
      'portfolioId',
    ]);
  });
});
