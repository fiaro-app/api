import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import {
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function send(
  testApp: TestApp,
  method: 'get' | 'post' | 'patch',
  path: string,
  cookie: string,
  body?: object,
) {
  const request = testApp.http[method](path)
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie);
  return body === undefined ? request : request.send(body);
}

describe('un segundo administrador y el dueño del negocio', () => {
  it('puede administrar a los demás, pero no puede tocar la membresía del dueño', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const me = await send(app, 'get', '/memberships/me', business.ownerCookie);
    const ownerMembershipId = (me.body as { id: string }).id;

    const invited = await send(
      app,
      'post',
      '/memberships',
      business.ownerCookie,
      {
        phone: '+573005000001',
        fullName: 'Lucía Administradora',
        nationalId: '50000001',
        contactEmail: 'lucia-50000001@example.com',
        roles: ['LENDER'],
      },
    );
    expect(invited.status).toBe(201);
    const tempPassword = (invited.body as { tempPassword: string })
      .tempPassword;
    const session = await signIn(app, {
      phone: '+573005000001',
      password: tempPassword,
    });
    const changed = await send(
      app,
      'post',
      '/auth/change-password',
      cookieOf(session),
      {
        currentPassword: tempPassword,
        newPassword: 'contraseña-nueva-de-lucia-1',
      },
    );
    const lucia = cookieOf(changed);

    const promoted = await send(
      app,
      'patch',
      `/memberships/${business.collectorMembershipId}/roles`,
      lucia,
      { roles: ['COLLECTOR', 'LENDER'] },
    );
    expect(promoted.status).toBe(200);
    expect((promoted.body as { roles: string[] }).roles).toContain('LENDER');

    for (const [method, path, body] of [
      [
        'patch',
        `/memberships/${ownerMembershipId}/roles`,
        { roles: ['LENDER'] },
      ],
      ['post', `/memberships/${ownerMembershipId}/deactivate`, undefined],
      ['post', `/memberships/${ownerMembershipId}/reset-password`, undefined],
    ] as const) {
      const response = await send(app, method, path, lucia, body);
      expect(response.status, path).toBe(400);
    }
  });
});
