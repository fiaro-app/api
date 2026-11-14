import { describe, expect, it } from 'vitest';
import { assertNotOwner } from '@/modules/memberships/application/services/assert-not-owner.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';

describe('assertNotOwner', () => {
  it('deja pasar a quien no es el dueño', () => {
    expect(() => {
      assertNotOwner(['LENDER', 'COLLECTOR'], 'desactivar');
    }).not.toThrow();
  });

  it('rechaza al dueño, con la acción en el mensaje', () => {
    let error: unknown;
    try {
      assertNotOwner(['OWNER', 'LENDER', 'COLLECTOR'], 'desactivar');
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidMembershipDataError);
    expect((error as InvalidMembershipDataError).issues[0]?.message).toContain(
      'desactivar',
    );
  });
});
