import { describe, expect, it, vi } from 'vitest';
import { PrismaSubscriptionAccess } from '@/modules/memberships/infrastructure/http/prisma-subscription-access.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const NOW = new Date('2026-10-20T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function accessFor(found: unknown) {
  const findUnique = vi.fn(() => Promise.resolve(found));
  return {
    access: new PrismaSubscriptionAccess(
      { lender: { findUnique } } as unknown as PrismaService,
      { now: () => NOW },
    ),
    findUnique,
  };
}

function endedDaysAgo(days: number, planCode = 'PRO') {
  return {
    tenant: {
      subscription: {
        planCode,
        currentPeriodEndsAt: new Date(NOW.getTime() - days * DAY_MS),
      },
    },
  };
}

describe('PrismaSubscriptionAccess', () => {
  it('con el período pagado no es solo lectura', async () => {
    expect(await accessFor(endedDaysAgo(-5)).access.isReadOnly('l')).toBe(
      false,
    );
  });

  it('dentro de la gracia (7 días) todavía se puede escribir', async () => {
    expect(await accessFor(endedDaysAgo(7)).access.isReadOnly('l')).toBe(false);
  });

  it('pasada la gracia es solo lectura', async () => {
    const { access, findUnique } = accessFor(endedDaysAgo(8));

    expect(await access.isReadOnly('lender-1')).toBe(true);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lender-1' } }),
    );
  });

  it('sin prestamista o sin suscripción no se bloquea', async () => {
    expect(await accessFor(null).access.isReadOnly('l')).toBe(false);
    expect(
      await accessFor({ tenant: { subscription: null } }).access.isReadOnly(
        'l',
      ),
    ).toBe(false);
  });

  it('las funciones salen del plan: Individual no trae ninguna; Pro, Team y la prueba sí', async () => {
    for (const [plan, expected] of [
      ['INDIVIDUAL', false],
      ['PRO', true],
      ['TEAM', true],
      ['TRIAL', true],
    ] as const) {
      const { access } = accessFor(endedDaysAgo(-5, plan));

      expect(await access.hasFeature('lender-1', 'ADVANCED_STATS')).toBe(
        expected,
      );
      expect(await access.hasFeature('lender-1', 'EXCEL_IMPORT')).toBe(
        expected,
      );
    }
  });

  it('sin prestamista o sin suscripción no se le quita ninguna función', async () => {
    expect(await accessFor(null).access.hasFeature('l', 'ADVANCED_STATS')).toBe(
      true,
    );
    expect(
      await accessFor({ tenant: { subscription: null } }).access.hasFeature(
        'l',
        'EXCEL_IMPORT',
      ),
    ).toBe(true);
  });
});
