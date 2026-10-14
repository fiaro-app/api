import { describe, expect, it } from 'vitest';
import { CreateCollectionAssignmentRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collection-assignment-requests.schema.js';

describe('CreateCollectionAssignmentRequestSchema', () => {
  it('acepta solo collectorMembershipId y effectiveFrom', () => {
    expect(
      CreateCollectionAssignmentRequestSchema.safeParse({
        collectorMembershipId: '01999999-9999-7999-9999-999999999999',
        effectiveFrom: '2026-10-01',
      }).success,
    ).toBe(true);
  });

  it('acepta effectiveTo', () => {
    expect(
      CreateCollectionAssignmentRequestSchema.safeParse({
        collectorMembershipId: '01999999-9999-7999-9999-999999999999',
        effectiveFrom: '2026-10-01',
        effectiveTo: '2026-10-01',
      }).success,
    ).toBe(true);
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(
      CreateCollectionAssignmentRequestSchema.safeParse({
        collectorMembershipId: '01999999-9999-7999-9999-999999999999',
        effectiveFrom: '01/10/2026',
      }).success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      CreateCollectionAssignmentRequestSchema.safeParse({
        collectorMembershipId: '01999999-9999-7999-9999-999999999999',
        effectiveFrom: '2026-10-01',
        nota: 'x',
      }).success,
    ).toBe(false);
  });
});
