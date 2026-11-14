import { describe, expect, it } from 'vitest';
import {
  summarizeRouteDays,
  type RouteVisit,
} from '@/modules/collections/infrastructure/persistence/route-day-summary.js';

const visit = (overrides: Partial<RouteVisit>): RouteVisit => ({
  occurredAt: new Date('2026-10-14T14:00:00Z'),
  outcome: 'PAID',
  expectedAmount: 30_000,
  collectorMembershipId: 'm-ana',
  collectorFullName: 'Ana Soto',
  collectedAmount: 30_000,
  ...overrides,
});

describe('summarizeRouteDays', () => {
  it('junta las visitas de un cobrador en un día: la primera y la última marcan la ruta', () => {
    const [day] = summarizeRouteDays([
      visit({ occurredAt: new Date('2026-10-14T13:05:00Z') }),
      visit({
        occurredAt: new Date('2026-10-14T15:00:00Z'),
        outcome: 'NOT_FOUND',
        collectedAmount: 0,
      }),
      visit({
        occurredAt: new Date('2026-10-14T21:30:00Z'),
        collectedAmount: 10_000,
      }),
    ]);

    expect(day).toEqual({
      date: '2026-10-14',
      collectorMembershipId: 'm-ana',
      collectorFullName: 'Ana Soto',
      startedAt: new Date('2026-10-14T13:05:00Z'),
      endedAt: new Date('2026-10-14T21:30:00Z'),
      visitsCount: 3,
      paidCount: 2,
      expectedAmount: 90_000,
      collectedAmount: 40_000,
    });
  });

  it('separa por cobrador y por día de Bogotá, no de UTC', () => {
    const days = summarizeRouteDays([
      visit({ occurredAt: new Date('2026-10-14T13:00:00Z') }),
      visit({
        occurredAt: new Date('2026-10-15T03:00:00Z'),
        collectorMembershipId: 'm-luis',
        collectorFullName: 'Luis Gil',
      }),
    ]);

    expect(days.map((day) => [day.date, day.collectorFullName])).toEqual([
      ['2026-10-14', 'Ana Soto'],
      ['2026-10-14', 'Luis Gil'],
    ]);
  });

  it('ordena del día más reciente al más antiguo y, en un día, por nombre', () => {
    const days = summarizeRouteDays([
      visit({ occurredAt: new Date('2026-10-13T14:00:00Z') }),
      visit({
        occurredAt: new Date('2026-10-14T14:00:00Z'),
        collectorMembershipId: 'm-luis',
        collectorFullName: 'Luis Gil',
      }),
      visit({ occurredAt: new Date('2026-10-14T15:00:00Z') }),
    ]);

    expect(days.map((day) => [day.date, day.collectorFullName])).toEqual([
      ['2026-10-14', 'Ana Soto'],
      ['2026-10-14', 'Luis Gil'],
      ['2026-10-13', 'Ana Soto'],
    ]);
  });

  it('sin visitas no hay rutas', () => {
    expect(summarizeRouteDays([])).toEqual([]);
  });
});
