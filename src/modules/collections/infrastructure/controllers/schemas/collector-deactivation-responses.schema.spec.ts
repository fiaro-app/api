import { describe, expect, it } from 'vitest';
import type { DeactivateCollectorResult } from '@/modules/collections/application/dtos/deactivate-collector.dto.js';
import { toCollectorDeactivationResponse } from '@/modules/collections/infrastructure/controllers/schemas/collector-deactivation-responses.schema.js';

describe('toCollectorDeactivationResponse', () => {
  it('convierte el resultado del caso de uso, con status INACTIVE', () => {
    const result: DeactivateCollectorResult = {
      membershipId: 'membership-collector',
      reassignedLoans: 3,
    };

    expect(toCollectorDeactivationResponse(result)).toEqual({
      id: 'membership-collector',
      status: 'INACTIVE',
      reassignedLoans: 3,
    });
  });

  it('acepta reassignedLoans en cero, sin préstamos que reasignar', () => {
    expect(
      toCollectorDeactivationResponse({
        membershipId: 'membership-collector',
        reassignedLoans: 0,
      }),
    ).toEqual({
      id: 'membership-collector',
      status: 'INACTIVE',
      reassignedLoans: 0,
    });
  });
});
