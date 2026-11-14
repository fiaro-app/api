import { describe, expect, it } from 'vitest';
import type { CollectorRouteEntry } from '@/modules/collections/application/dtos/collector-route-entry.dto.js';
import { sortRouteByPriority } from '@/modules/collections/application/services/sort-route-by-priority.js';

function entry(
  name: string,
  overdueDays: number,
  overdueAmount: number,
  collectedToday = 0,
): CollectorRouteEntry {
  return {
    loanId: name,
    clientId: name,
    clientFullName: name,
    balance: 100_000,
    overdueAmount,
    overdueDays,
    nextDueDate: null,
    collectedToday,
  };
}

const names = (rows: readonly CollectorRouteEntry[]) =>
  rows.map((row) => row.clientFullName);

describe('sortRouteByPriority', () => {
  it('pone primero al que combina más mora y más deuda', () => {
    const sorted = sortRouteByPriority([
      entry('Poca', 2, 20_000),
      entry('Mucha', 30, 300_000),
      entry('Media', 10, 100_000),
    ]);
    expect(names(sorted)).toEqual(['Mucha', 'Media', 'Poca']);
  });

  it('pesa igual los días y el dinero', () => {
    const sorted = sortRouteByPriority([
      entry('SoloDias', 30, 0),
      entry('Ambos', 20, 200_000),
      entry('SoloDinero', 0, 300_000),
    ]);
    expect(names(sorted)).toEqual(['Ambos', 'SoloDias', 'SoloDinero']);
  });

  it('manda al final a quien ya pagó hoy y desempata por nombre', () => {
    const sorted = sortRouteByPriority([
      entry('Zeta', 40, 400_000, 10_000),
      entry('Beto', 0, 0),
      entry('Ana', 0, 0),
    ]);
    expect(names(sorted)).toEqual(['Ana', 'Beto', 'Zeta']);
  });

  it('entre los que ya pagaron hoy, desempata por nombre', () => {
    const sorted = sortRouteByPriority([
      entry('Zeta', 0, 0, 5_000),
      entry('Ana', 9, 90_000, 5_000),
    ]);
    expect(names(sorted)).toEqual(['Ana', 'Zeta']);
  });

  it('con mora en días pero sin dinero vencido, ordena por días', () => {
    const sorted = sortRouteByPriority([
      entry('Poca', 2, 0),
      entry('Mucha', 20, 0),
    ]);
    expect(names(sorted)).toEqual(['Mucha', 'Poca']);
  });

  it('con dinero vencido pero sin días, ordena por dinero', () => {
    const sorted = sortRouteByPriority([
      entry('Poco', 0, 10_000),
      entry('Mucho', 0, 90_000),
    ]);
    expect(names(sorted)).toEqual(['Mucho', 'Poco']);
  });
});
