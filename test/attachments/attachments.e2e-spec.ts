import { toBusinessDate } from '@fiaro-app/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { nextIp } from '@test/support/auth-flow.js';
import {
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { seedLoan } from '@test/support/seed-loan.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };
const UPLOAD = { contentType: 'image/jpeg', sizeBytes: 240_000 };

function call(
  testApp: TestApp,
  method: 'get' | 'post' | 'delete',
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

describe('el comprobante de un pago', () => {
  it('quien administra pide la URL firmada y todavía no hay comprobante; un pago ajeno da 404', async () => {
    app = await startTestApp(START);
    const { cookie, lenderId } = await seedLoan(app, {
      startDate: addDays(toBusinessDate(new Date()), -1),
      paidAmounts: [10_000],
    });
    const report = await httpQuery(app.http, '/collection-visits')
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp())
      .send({});
    const paymentId =
      (report.body.data as { payment: { id: string } | null }[])[0]?.payment
        ?.id ?? '';
    expect(paymentId).not.toBe('');

    const upload = await call(
      app,
      'post',
      `/payments/${paymentId}/proof/upload-url`,
      cookie,
      UPLOAD,
    );
    const view = await call(app, 'get', `/payments/${paymentId}/proof`, cookie);
    const other = await seedBusinessWithCollector(app);
    const stranger = await call(
      app,
      'get',
      `/payments/${paymentId}/proof`,
      other.ownerCookie,
    );

    expect(upload.status).toBe(201);
    expect((upload.body as { key: string }).key).toMatch(
      new RegExp(`^payment-proofs/${lenderId}/${paymentId}/`),
    );
    expect(view.body).toEqual({ url: null, expiresAt: null });
    expect(stranger.status).toBe(404);
  });
});
