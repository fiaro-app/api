import { describe, expect, it } from 'vitest';
import { DeactivateCollectorRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-deactivation-requests.schema.js';

const LOAN_ID = '01999999-9999-7999-9999-999999999991';
const COLLECTOR_ID = '01999999-9999-7999-9999-999999999992';

describe('DeactivateCollectorRequestSchema', () => {
  it('sin reassignments, se completa con un arreglo vacío', () => {
    const parsed = DeactivateCollectorRequestSchema.safeParse({});

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.reassignments).toEqual([]);
  });

  it('acepta una lista de reasignaciones', () => {
    expect(
      DeactivateCollectorRequestSchema.safeParse({
        reassignments: [
          { loanId: LOAN_ID, collectorMembershipId: COLLECTOR_ID },
        ],
      }).success,
    ).toBe(true);
  });

  it('rechaza un loanId que no es un id válido', () => {
    expect(
      DeactivateCollectorRequestSchema.safeParse({
        reassignments: [
          { loanId: 'no-es-un-id', collectorMembershipId: COLLECTOR_ID },
        ],
      }).success,
    ).toBe(false);
  });

  it('rechaza una reasignación sin collectorMembershipId', () => {
    expect(
      DeactivateCollectorRequestSchema.safeParse({
        reassignments: [{ loanId: LOAN_ID }],
      }).success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      DeactivateCollectorRequestSchema.safeParse({
        reassignments: [],
        nota: 'x',
      }).success,
    ).toBe(false);
  });
});
