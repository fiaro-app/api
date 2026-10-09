import { describe, expect, it } from 'vitest';
import {
  computeSubscriptionState,
  SUBSCRIPTION_GRACE_DAYS,
} from '@/modules/subscriptions/domain/policies/subscription-status.js';

const ENDS_AT = new Date('2026-10-31T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(ENDS_AT.getTime() + offsetMs);

describe('computeSubscriptionState', () => {
  it('con el período vigente está ACTIVE y cuenta los días que faltan', () => {
    const state = computeSubscriptionState(ENDS_AT, at(-10 * DAY));

    expect(state).toMatchObject({
      status: 'ACTIVE',
      daysRemaining: 10,
      graceDaysRemaining: 0,
    });
  });

  it('cuenta los días hacia arriba: faltando una hora, falta un día', () => {
    expect(
      computeSubscriptionState(ENDS_AT, at(-60 * 60 * 1000)).daysRemaining,
    ).toBe(1);
  });

  it('en el instante exacto del vencimiento sigue ACTIVE, con cero días', () => {
    expect(computeSubscriptionState(ENDS_AT, ENDS_AT)).toMatchObject({
      status: 'ACTIVE',
      daysRemaining: 0,
    });
  });

  it('el graceEndsAt es el vencimiento más los días de gracia', () => {
    expect(computeSubscriptionState(ENDS_AT, ENDS_AT).graceEndsAt).toEqual(
      at(SUBSCRIPTION_GRACE_DAYS * DAY),
    );
    expect(SUBSCRIPTION_GRACE_DAYS).toBe(7);
  });

  it('recién vencido, está en GRACE_PERIOD y cuenta los días de gracia que quedan', () => {
    const state = computeSubscriptionState(ENDS_AT, at(1));

    expect(state).toMatchObject({
      status: 'GRACE_PERIOD',
      daysRemaining: 0,
      graceDaysRemaining: 7,
    });
  });

  it('al día 3 de gracia quedan 4 días', () => {
    expect(
      computeSubscriptionState(ENDS_AT, at(3 * DAY)).graceDaysRemaining,
    ).toBe(4);
  });

  it('en el instante exacto del fin de la gracia sigue en GRACE_PERIOD', () => {
    expect(
      computeSubscriptionState(ENDS_AT, at(SUBSCRIPTION_GRACE_DAYS * DAY)),
    ).toMatchObject({ status: 'GRACE_PERIOD', graceDaysRemaining: 0 });
  });

  it('pasada la gracia, es READ_ONLY', () => {
    expect(
      computeSubscriptionState(ENDS_AT, at(SUBSCRIPTION_GRACE_DAYS * DAY + 1)),
    ).toMatchObject({
      status: 'READ_ONLY',
      daysRemaining: 0,
      graceDaysRemaining: 0,
    });
  });
});
