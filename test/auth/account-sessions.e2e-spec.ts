import { v7 as uuidv7 } from 'uuid';
import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  login,
  nextIp,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const CHROME_ON_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const listSessions = (app: TestApp, cookie?: string) => {
  const request = app.http
    .get('/account/sessions')
    .set('X-Forwarded-For', nextIp());
  return cookie === undefined ? request : request.set('Cookie', cookie);
};

const closeSession = (app: TestApp, id: string, cookie?: string) => {
  const request = app.http
    .delete(`/account/sessions/${id}`)
    .set('X-Forwarded-For', nextIp())
    .set('Origin', APP_ORIGIN);
  return cookie === undefined ? request : request.set('Cookie', cookie);
};

interface SessionRow {
  id: string;
  isCurrent: boolean;
  device: { label: string };
  ipAddress: string | null;
}

describe('GET /account/sessions', () => {
  it('lista las sesiones abiertas, marca la actual, describe el dispositivo y nunca trae el token', async () => {
    const app = await startWithUser();
    const desktop = await login(app);
    const phone = await login(app);
    await app.prisma.session.updateMany({
      data: { userAgent: CHROME_ON_WINDOWS },
    });

    const response = await listSessions(app, desktop);

    expect(response.status).toBe(200);
    const rows = response.body as SessionRow[];
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.isCurrent)).toHaveLength(1);
    expect(rows.every((row) => row.device.label === 'Chrome en Windows')).toBe(
      true,
    );
    expect(JSON.stringify(response.body)).not.toContain('token');
    const asPhone = (await listSessions(app, phone)).body as SessionRow[];
    expect(asPhone.find((row) => row.isCurrent)?.id).not.toBe(
      rows.find((row) => row.isCurrent)?.id,
    );
  });

  it('no incluye las sesiones vencidas ni las de otras personas', async () => {
    const app = await startWithUser();
    await app.createUser({
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      password: 'otra-clave-larga-1',
    });
    await signIn(app, {
      phone: '+573109998877',
      password: 'otra-clave-larga-1',
    });
    const current = await login(app);
    await login(app);
    const before = (await listSessions(app, current)).body as SessionRow[];
    const stale = before.find((row) => !row.isCurrent);
    await app.prisma.session.update({
      where: { id: stale?.id ?? '' },
      data: { expiresAt: new Date('2020-01-01T00:00:00Z') },
    });

    const after = (await listSessions(app, current)).body as SessionRow[];

    expect(before).toHaveLength(2); // la de Luis no cuenta
    expect(after.map((row) => row.id)).toEqual(
      before.filter((row) => row.isCurrent).map((row) => row.id),
    );
  });

  it('sin sesión responde 401', async () => {
    const app = await startWithUser();

    const response = await listSessions(app);

    expect(response.status).toBe(401);
  });
});

describe('DELETE /account/sessions/:id', () => {
  it('cierra solo la sesión pedida: ese dispositivo pierde el acceso y los demás no', async () => {
    const app = await startWithUser();
    const desktop = await login(app);
    const phone = await login(app);
    const rows = (await listSessions(app, desktop)).body as SessionRow[];
    const phoneSession = rows.find((row) => !row.isCurrent);

    const response = await closeSession(app, phoneSession?.id ?? '', desktop);

    expect(response.status).toBe(204);
    expect((await whoami(app, phone)).status).toBe(401);
    expect((await whoami(app, desktop)).status).toBe(200);
  });

  it('responde 409 si es la sesión actual: para salir está sign-out', async () => {
    const app = await startWithUser();
    const desktop = await login(app);
    const rows = (await listSessions(app, desktop)).body as SessionRow[];
    const current = rows.find((row) => row.isCurrent);

    const response = await closeSession(app, current?.id ?? '', desktop);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
    expect((await whoami(app, desktop)).status).toBe(200);
  });

  it('responde 404 para una sesión que no existe', async () => {
    const app = await startWithUser();
    const desktop = await login(app);

    const response = await closeSession(app, uuidv7(), desktop);

    expect(response.status).toBe(404);
  });

  it('responde 404 para la sesión de otra persona, sin cerrarla', async () => {
    const app = await startWithUser();
    await app.createUser({
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      password: 'otra-clave-larga-1',
    });
    const luisResponse = await signIn(app, {
      phone: '+573109998877',
      password: 'otra-clave-larga-1',
    });
    const luisCookie = (
      luisResponse.headers['set-cookie'] as unknown as string[]
    )
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    const luisSession = (await listSessions(app, luisCookie))
      .body as SessionRow[];
    const desktop = await login(app);

    const response = await closeSession(app, luisSession[0]?.id ?? '', desktop);

    expect(response.status).toBe(404);
    expect((await whoami(app, luisCookie)).status).toBe(200);
  });

  it('responde 400 con un id inválido y 401 sin sesión', async () => {
    const app = await startWithUser();
    const desktop = await login(app);

    const badId = await closeSession(app, 'no-es-uuid', desktop);
    const anonymous = await closeSession(app, uuidv7());

    expect(badId.status).toBe(400);
    expect(anonymous.status).toBe(401);
  });
});
