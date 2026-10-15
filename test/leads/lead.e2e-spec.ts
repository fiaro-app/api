import { afterEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;
let ipSeq = 0;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Una IP distinta en cada llamada: cada prueba cuenta su propio límite. */
const nextIp = () => `198.51.100.${String((ipSeq += 1) % 250)}`;

const VALID = {
  name: 'Ana Pérez',
  phone: '300 123 4567',
  message: 'Quiero probar Fiaro con mis 3 cobradores.',
};

function post(testApp: TestApp, body: object, ip = nextIp()) {
  return testApp.http.post('/leads').set('X-Forwarded-For', ip).send(body);
}

describe('POST /leads', () => {
  it('guarda el contacto con el celular normalizado y avisa a ventas, sin sesión', async () => {
    app = await startTestApp({
      env: { LEADS_NOTIFY_EMAIL: 'ventas@fiaro.co' },
    });

    const response = await post(app, VALID);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ received: true });
    const saved = await app.prisma.lead.findMany();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name: 'Ana Pérez',
      phone: '+573001234567',
      email: null,
      message: 'Quiero probar Fiaro con mis 3 cobradores.',
    });
    expect(app.emails.sent).toHaveLength(1);
    expect(app.emails.sent[0]).toMatchObject({
      to: 'ventas@fiaro.co',
      subject: 'Fiaro: Nuevo contacto de ventas: Ana Pérez',
    });
  });

  it('acepta un correo en vez del celular', async () => {
    app = await startTestApp();

    const response = await post(app, {
      name: 'Ana',
      email: 'Ana@Ejemplo.co',
      message: 'Hola, quiero info',
    });

    expect(response.status).toBe(201);
    expect(await app.prisma.lead.findFirst()).toMatchObject({
      phone: null,
      email: 'ana@ejemplo.co',
    });
  });

  it('sin correo de ventas configurado, el contacto igual queda guardado', async () => {
    app = await startTestApp();

    const response = await post(app, VALID);

    expect(response.status).toBe(201);
    expect(await app.prisma.lead.count()).toBe(1);
    expect(app.emails.sent).toHaveLength(0);
  });

  it('con el campo señuelo lleno responde igual, pero no guarda nada ni avisa', async () => {
    app = await startTestApp({
      env: { LEADS_NOTIFY_EMAIL: 'ventas@fiaro.co' },
    });

    const response = await post(app, {
      ...VALID,
      website: 'https://spam.example',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ received: true });
    expect(await app.prisma.lead.count()).toBe(0);
    expect(app.emails.sent).toHaveLength(0);
  });

  it.each([
    ['sin celular ni correo', { name: 'Ana', message: 'Hola, quiero info' }],
    ['con un celular que no es colombiano', { ...VALID, phone: '12345' }],
    ['con un correo mal formado', { ...VALID, email: 'no-es-un-correo' }],
    ['con un nombre vacío', { ...VALID, name: '' }],
    ['con un campo que la ruta no declara', { ...VALID, plan: 'pro' }],
  ])('responde 400 %s y no guarda nada', async (_name, body) => {
    app = await startTestApp();

    const response = await post(app, body);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(await app.prisma.lead.count()).toBe(0);
  });

  it('limita a 5 contactos por hora desde la misma IP, y a otra IP no la afecta', async () => {
    app = await startTestApp();
    const ip = nextIp();

    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await post(app, VALID, ip)).status);
    }
    const other = await post(app, VALID);

    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    expect(other.status).toBe(201);
  });

  it('la respuesta limitada trae RATE_LIMITED y Retry-After', async () => {
    app = await startTestApp();
    const ip = nextIp();
    for (let i = 0; i < 5; i += 1) {
      await post(app, VALID, ip);
    }

    const blocked = await post(app, VALID, ip);

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });
});
