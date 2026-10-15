import { afterEach, describe, expect, it } from 'vitest';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import {
  assignNewLoan,
  HEADERS,
  seedBusinessWithCollector,
  verifyContactEmail,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const CORS = { CORS_ORIGINS: HEADERS.Origin };

/** Los correos con ese asunto que se pidieron enviar a esa dirección. */
function sentTo(testApp: TestApp, to: string, subject: string): EmailMessage[] {
  return testApp.emails.sent.filter(
    (email) => email.to === to && email.subject === subject,
  );
}

describe('correo de las notificaciones (D-94)', () => {
  it('no manda el correo de un préstamo asignado a un correo de contacto sin verificar', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await app.prisma.user.update({
      where: { phone: business.collectorPhone },
      data: { contactEmail: 'cobrador@example.com' },
    });

    await assignNewLoan(app, business);

    expect(
      sentTo(app, 'cobrador@example.com', 'Fiaro: Préstamo asignado'),
    ).toHaveLength(0);
  });

  it('un préstamo asignado es informativo: no sale por correo, ni con el correo verificado (D-125)', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(
      app,
      business.collectorPhone,
      'cobrador@example.com',
    );

    await assignNewLoan(app, business);

    expect(
      sentTo(app, 'cobrador@example.com', 'Fiaro: Préstamo asignado'),
    ).toHaveLength(0);
  });

  it('no manda correo a una cuenta desactivada, aunque su correo esté verificado', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(
      app,
      business.collectorPhone,
      'cobrador@example.com',
    );
    await app.prisma.user.update({
      where: { phone: business.collectorPhone },
      data: { deactivatedAt: new Date('2026-10-05T12:00:00Z') },
    });

    await assignNewLoan(app, business);

    expect(
      sentTo(app, 'cobrador@example.com', 'Fiaro: Préstamo asignado'),
    ).toHaveLength(0);
  });

  it('el cuadre enviado es informativo: la dueña lo ve como push y en la app, no por correo (D-125)', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(app, business.ownerPhone, 'marta@example.com');

    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    expect(submitted.status).toBe(200);

    expect(
      sentTo(app, 'marta@example.com', 'Fiaro: Cuadre por revisar'),
    ).toHaveLength(0);
  });

  it('el correo del cuadre rechazado escapa la nota de quien revisó en el HTML', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(
      app,
      business.collectorPhone,
      'cobrador@example.com',
    );
    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    const settlementId = (submitted.body as { id: string }).id;

    const rejected = await app.http
      .post(`/daily-settlements/${settlementId}/reject`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ reviewNote: 'Revisa <b>el efectivo</b>.' });
    expect(rejected.status).toBe(200);

    const [email] = sentTo(
      app,
      'cobrador@example.com',
      'Fiaro: Cuadre rechazado',
    );
    expect(email?.html).toContain(
      '<p>Revisa &lt;b&gt;el efectivo&lt;/b&gt;.</p>',
    );
    expect(email?.text).toContain('Revisa <b>el efectivo</b>.');
  });
});
