import { describe, expect, it } from 'vitest';
import { tallyMora } from '@/modules/alerts/domain/mora/mora-tally.js';

describe('tallyMora', () => {
  it('cuenta solo los préstamos con saldo vencido y suma lo que deben', () => {
    expect(
      tallyMora([
        { overdueAmount: 20_000 },
        { overdueAmount: 0 },
        { overdueAmount: 5_500 },
      ]),
    ).toEqual({ loansInMora: 2, overdueAmount: 25_500 });
  });

  it('sin préstamos en mora, todo queda en cero', () => {
    expect(tallyMora([{ overdueAmount: 0 }])).toEqual({
      loansInMora: 0,
      overdueAmount: 0,
    });
    expect(tallyMora([])).toEqual({ loansInMora: 0, overdueAmount: 0 });
  });
});
