import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import { seedLoan } from '@test/support/seed-loan.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const risk = (testApp: TestApp, cookie: string, body: object) =>
  httpQuery(testApp.http, '/lenders/me/clients/risk')
    .set('Cookie', cookie)
    .set('X-Forwarded-For', nextIp())
    .send(body);

describe('QUERY /lenders/me/clients/risk', () => {
  it('puntúa la mora de hoy del cliente y deja sin historial a quien no tiene préstamos aquí', async () => {
    app = await startTestApp();
    const business = await seedLoan(app);
    const stranger = uuidv7();

    const response = await risk(app, business.cookie, {
      clientIds: [business.clientId, stranger],
    });

    expect(response.status).toBe(200);
    const [late, fresh] = response.body.data;
    expect(late).toMatchObject({ clientId: business.clientId, loansCount: 1 });
    expect(late.score).toBeGreaterThan(0);
    const codes = (late.factors as { code: string }[]).map((f) => f.code);
    expect(codes).toContain('OVERDUE_DAYS');
    expect(fresh).toEqual({
      clientId: stranger,
      score: 0,
      level: 'LOW',
      loansCount: 0,
      factors: [],
    });
  });

  it('rechaza una lista vacía, con más de 50 o con ids que no son UUID', async () => {
    app = await startTestApp();
    const business = await seedLoan(app);

    for (const clientIds of [
      [],
      Array.from({ length: 51 }, () => uuidv7()),
      ['no-es-uuid'],
    ]) {
      const response = await risk(app, business.cookie, { clientIds });
      expect(response.status).toBe(400);
    }
  });

  it('solo OWNER o LENDER lo ven: un cobrador recibe 403', async () => {
    app = await startTestApp();
    const business = await seedLoan(app);
    await app.prisma.membership.update({
      where: { id: business.membershipId },
      data: { roles: ['COLLECTOR'] },
    });

    const response = await risk(app, business.cookie, {
      clientIds: [business.clientId],
    });

    expect(response.status).toBe(403);
  });

  it('sin sesión responde 401', async () => {
    app = await startTestApp();
    const response = await httpQuery(app.http, '/lenders/me/clients/risk')
      .set('X-Forwarded-For', nextIp())
      .send({ clientIds: [uuidv7()] });
    expect(response.status).toBe(401);
  });
});
