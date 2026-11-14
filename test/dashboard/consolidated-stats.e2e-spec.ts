import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { HEADERS, seedAssignedLoan } from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function started(): TestApp {
  if (app === undefined) {
    throw new Error('la prueba debe arrancar la aplicación primero');
  }
  return app;
}

async function business(planCode: string) {
  app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
  const seeded = await seedAssignedLoan(app);
  await app.prisma.subscription.updateMany({ data: { planCode } });
  return seeded;
}

function consolidated(cookie: string) {
  return httpQuery(started().http, '/lenders/me/consolidated-stats')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({});
}

describe('estadísticas consolidadas (D-155)', () => {
  it.each(['INDIVIDUAL', 'PRO'])(
    'con el plan %s responde 403 PLAN_FEATURE_UNAVAILABLE',
    async (plan) => {
      const owner = await business(plan);

      const response = await consolidated(owner.ownerCookie);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PLAN_FEATURE_UNAVAILABLE');
    },
  );

  it('un cobrador no las ve', async () => {
    const owner = await business('TEAM');

    expect((await consolidated(owner.collectorCookie)).status).toBe(403);
  });

  it('en Team suma los negocios de la dueña y deja fuera los de otro Tenant', async () => {
    const owner = await business('TEAM');
    const prisma = started().prisma;
    const first = await prisma.membership.findFirstOrThrow({
      where: { roles: { has: 'OWNER' } },
      include: { lender: true },
    });
    const second = await prisma.lender.create({
      data: {
        id: uuidv7(),
        tenantId: first.lender.tenantId,
        name: 'Segundo negocio',
      },
    });
    await prisma.membership.create({
      data: {
        id: uuidv7(),
        userId: first.userId,
        lenderId: second.id,
        roles: ['OWNER'],
      },
    });
    const foreignTenant = await prisma.tenant.create({
      data: { id: uuidv7(), name: 'Otro Tenant' },
    });
    const foreign = await prisma.lender.create({
      data: { id: uuidv7(), tenantId: foreignTenant.id, name: 'Ajeno' },
    });
    await prisma.membership.create({
      data: {
        id: uuidv7(),
        userId: first.userId,
        lenderId: foreign.id,
        roles: ['OWNER'],
      },
    });

    const response = await consolidated(owner.ownerCookie);

    expect(response.status).toBe(200);
    const names = (response.body.lenders as { name: string }[]).map(
      (lender) => lender.name,
    );
    expect(names).toContain('Segundo negocio');
    expect(names).not.toContain('Ajeno');
    expect(names).toHaveLength(2);
    expect(response.body.totals.totalPortfolio).toBe(
      (response.body.lenders as { totalPortfolio: number }[]).reduce(
        (acc, lender) => acc + lender.totalPortfolio,
        0,
      ),
    );
  });
});
