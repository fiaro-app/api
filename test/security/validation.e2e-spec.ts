import { describe, expect, it } from 'vitest';
import { httpQuery, useSecurityApp } from '@test/support/security-app.js';

const startApp = useSecurityApp();

describe('validación', () => {
  it('acepta un body válido y le aplica los valores por defecto', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/echo')
      .send({ name: 'Ana' })
      .expect(201);

    expect(body).toEqual({ name: 'Ana', amount: 1 });
  });

  it('rechaza un body inválido con 400 VALIDATION_FAILED y el detalle por campo', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/echo')
      .send({ name: '', amount: 0 })
      .expect(400);

    expect(body).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Los datos enviados no son válidos.',
    });
    const { issues } = body as { issues: { path: string[] }[] };
    expect(issues.map((issue) => issue.path)).toEqual([['name'], ['amount']]);
  });

  it('escribe los mensajes en español con los valores de cada falla', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/echo')
      .send({ name: '', amount: 0 })
      .expect(400);

    expect(body.issues).toEqual([
      { path: ['name'], message: 'La longitud mínima es 1.' },
      { path: ['amount'], message: 'Debe ser mayor o igual a 1.' },
    ]);
  });

  it('distingue el dato que falta del que tiene el tipo equivocado', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/echo')
      .send({ amount: 'muchos' })
      .expect(400);

    expect(body.issues).toEqual([
      { path: ['name'], message: 'Este dato es obligatorio.' },
      { path: ['amount'], message: 'Debe ser un número.' },
    ]);
  });

  it('rechaza los campos que el contrato no declara', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/echo')
      .send({ name: 'Ana', role: 'admin' })
      .expect(400);

    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.issues[0].message).toBe('Dato no esperado: role.');
  });

  it('valida también el body de las rutas QUERY', async () => {
    const api = await startApp();

    const valid = await httpQuery(api, '/probe/search').send({
      text: 'ana',
    });
    const invalid = await httpQuery(api, '/probe/search').send({ text: 1 });

    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ got: { text: 'ana' } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION_FAILED');
  });

  it('descarta las llaves __proto__ antes de validar', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/echo')
      .set('Content-Type', 'application/json')
      .send('{"name":"Ana","__proto__":{"admin":true}}')
      .expect(201);

    expect(body).toEqual({ name: 'Ana', amount: 1 });
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });

  it('un @Body() sin schema termina en 500 sin revelar el motivo', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/unvalidated')
      .send({ cualquier: 'cosa' })
      .expect(500);

    expect(JSON.stringify(body)).not.toContain('schema');
  });
});
