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

describe('la foto de un cliente', () => {
  it('quien administra pide la URL firmada, la llave queda en la carpeta del cliente y todavía no hay foto que ver', async () => {
    app = await startTestApp(START);
    const { cookie, clientId, lenderId } = await seedLoan(app);

    const upload = await call(
      app,
      'post',
      `/clients/${clientId}/photo/upload-url`,
      cookie,
      UPLOAD,
    );

    expect(upload.status).toBe(201);
    const body = upload.body as {
      uploadUrl: string;
      key: string;
      expiresAt: string;
    };
    expect(body.key).toMatch(
      new RegExp(`^client-photos/${lenderId}/${clientId}/[0-9a-f-]{36}\\.jpg$`),
    );
    expect(body.uploadUrl).toContain('X-Amz-Signature=');
    const view = await call(app, 'get', `/clients/${clientId}/photo`, cookie);
    expect(view.status).toBe(200);
    expect(view.body).toEqual({ url: null, expiresAt: null });
  });

  it('rechaza guardar una llave que no es de ese cliente, borrar sin foto no falla y un tipo no permitido da 400', async () => {
    app = await startTestApp(START);
    const { cookie, clientId } = await seedLoan(app);

    const attach = await call(
      app,
      'post',
      `/clients/${clientId}/photo`,
      cookie,
      {
        key: `client-photos/otro/otro/019dc2d6-0000-7000-8000-000000000001.jpg`,
      },
    );
    const remove = await call(
      app,
      'delete',
      `/clients/${clientId}/photo`,
      cookie,
    );
    const badType = await call(
      app,
      'post',
      `/clients/${clientId}/photo/upload-url`,
      cookie,
      { contentType: 'image/svg+xml', sizeBytes: 1000 },
    );

    expect(attach.status).toBe(400);
    expect(attach.body).toMatchObject({ errorCode: 'P920V' });
    expect(remove.status).toBe(204);
    expect(badType.status).toBe(400);
  });

  it('un cliente de otro negocio da 404, y sin sesión 401', async () => {
    app = await startTestApp(START);
    const { clientId } = await seedLoan(app);
    const other = await seedBusinessWithCollector(app);

    const stranger = await call(
      app,
      'get',
      `/clients/${clientId}/photo`,
      other.ownerCookie,
    );
    const anonymous = await app.http
      .get(`/clients/${clientId}/photo`)
      .set(HEADERS);

    expect(stranger.status).toBe(404);
    expect(anonymous.status).toBe(401);
  });
});

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
