import { afterEach, describe, expect, it } from 'vitest';
import { RunMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/run-mora-alerts.use-case.js';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import { httpQuery } from '@test/support/security-app.js';
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

/** La fecha de negocio del envío; el saldo se calcula con el reloj real, como en la app. */
const DAY = '2026-10-06';

/** Los correos de mora que llegaron a esa dirección. */
function moraEmailsTo(testApp: TestApp, to: string): EmailMessage[] {
  return testApp.emails.sent.filter(
    (email) => email.to === to && email.subject === 'Fiaro: Préstamos en mora',
  );
}

/** Los títulos de las notificaciones del feed de una sesión. */
async function feedTitles(testApp: TestApp, cookie: string): Promise<string[]> {
  const page = await httpQuery(testApp.http, '/notifications')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({});
  return (page.body as { data: { title: string }[] }).data.map(
    (item) => item.title,
  );
}

describe('aviso diario de mora (D-96)', () => {
  it('avisa a quien administra por correo y en el feed, y deja el día registrado', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(app, business.ownerPhone, 'marta@example.com');
    await assignNewLoan(app, business);

    const run = app.app.get(RunMoraAlertsUseCase, { strict: false });
    await expect(run.execute(DAY)).resolves.toBe(true);

    const [email] = moraEmailsTo(app, 'marta@example.com');
    expect(email?.text).toContain(
      'Hoy tienes 1 préstamo en mora por $ 20.000 en total.',
    );
    expect(await feedTitles(app, business.ownerCookie)).toContain(
      'Préstamos en mora',
    );
    expect(await feedTitles(app, business.collectorCookie)).not.toContain(
      'Préstamos en mora',
    );

    const record = await app.prisma.moraAlertRun.findUnique({
      where: { businessDate: new Date(`${DAY}T00:00:00.000Z`) },
    });
    expect(record?.finishedAt).not.toBeNull();
    expect(record?.lendersNotified).toBe(1);
    expect(record?.loansInMora).toBe(1);
  });

  it('el mismo día no vuelve a avisar, aunque se llame otra vez', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(app, business.ownerPhone, 'marta@example.com');
    await assignNewLoan(app, business);
    const run = app.app.get(RunMoraAlertsUseCase, { strict: false });
    await run.execute(DAY);

    await expect(run.execute(DAY)).resolves.toBe(false);

    expect(moraEmailsTo(app, 'marta@example.com')).toHaveLength(1);
  });

  it('un prestamista sin préstamos en mora no recibe aviso, pero el día queda registrado', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(app, business.ownerPhone, 'marta@example.com');
    await assignNewLoan(app, business, { startDate: '2030-01-01' });

    const run = app.app.get(RunMoraAlertsUseCase, { strict: false });
    await expect(run.execute(DAY)).resolves.toBe(true);

    expect(moraEmailsTo(app, 'marta@example.com')).toHaveLength(0);
    expect(await feedTitles(app, business.ownerCookie)).not.toContain(
      'Préstamos en mora',
    );
    const record = await app.prisma.moraAlertRun.findUnique({
      where: { businessDate: new Date(`${DAY}T00:00:00.000Z`) },
    });
    expect(record?.lendersNotified).toBe(0);
    expect(record?.loansInMora).toBe(0);
  });
});
