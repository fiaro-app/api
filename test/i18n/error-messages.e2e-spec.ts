import { ApiErrorSchema } from '@fiaro-app/contracts';
import { describe, expect, it } from 'vitest';
import { useSecurityApp } from '@test/support/security-app.js';

const startApp = useSecurityApp();

const NOT_FOUND_ES = 'No encontramos lo que buscas.';

describe('mensajes de error traducidos', () => {
  describe('idioma según Accept-Language', () => {
    it.each([
      ['sin la cabecera', undefined],
      ['pidiendo español', 'es'],
      ['pidiendo español de Colombia', 'es-CO,es;q=0.9,en;q=0.8'],
      ['pidiendo un idioma que la API no habla', 'fr-FR,fr;q=0.9'],
      ['aceptando cualquier idioma', '*'],
      ['con una cabecera mal formada', ';;q=,==,'],
    ])('%s responde en español', async (_caso, header) => {
      const api = await startApp();
      const request = api.get('/no-existe');

      const response = await (header === undefined
        ? request
        : request.set('Accept-Language', header));

      expect(response.status).toBe(404);
      expect(response.headers['content-language']).toBe('es');
      expect(response.body.message).toBe(NOT_FOUND_ES);
    });

    it('el error dice que su texto cambia según Accept-Language, para las cachés', async () => {
      const api = await startApp();

      const response = await api.get('/no-existe');

      expect(response.headers.vary).toContain('Accept-Language');
    });

    it('una respuesta que no es un error no lleva texto para personas: ni Content-Language ni Vary por idioma', async () => {
      const api = await startApp();

      const response = await api.get('/probe/ping').expect(200);

      expect(response.headers['content-language']).toBeUndefined();
      expect(response.headers.vary).not.toContain('Accept-Language');
    });
  });

  describe('la forma del error', () => {
    it('cumple ApiError de contracts: estado, código, mensaje, ruta, hora y detalle', async () => {
      const api = await startApp({ nodeEnv: 'production' });

      const { body } = await api.get('/no-existe').expect(404);

      expect(body).toMatchObject(ApiErrorSchema.parse(body));
      expect(body).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: NOT_FOUND_ES,
        path: '/no-existe',
        timestamp: expect.any(String),
        issues: null,
        errorCode: expect.stringMatching(/^[A-Z]\d{3}[A-Z]$/),
        requestId: expect.any(String),
      });
    });

    it('no repite el texto en inglés de Nest ni la ruta pedida', async () => {
      const api = await startApp({ nodeEnv: 'production' });

      const { body } = await api.get('/no-existe').expect(404);

      expect(JSON.stringify(body)).not.toContain('Cannot GET');
    });

    it('la ruta sale sin la cadena de consulta', async () => {
      const api = await startApp({ nodeEnv: 'production' });

      const { body } = await api.get('/no-existe?token=secreto').expect(404);

      expect(body.path).toBe('/no-existe');
      expect(JSON.stringify(body)).not.toContain('secreto');
    });
  });

  describe('errores que ocurren antes de llegar a una ruta', () => {
    it('un JSON mal formado responde 400 BAD_REQUEST, sin el texto del parser', async () => {
      const api = await startApp({ nodeEnv: 'production' });

      const { body } = await api
        .post('/probe/echo')
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);

      expect(body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'La solicitud no es válida.',
      });
      expect(JSON.stringify(body)).not.toContain('JSON');
    });

    it('un cuerpo demasiado grande responde 413 PAYLOAD_TOO_LARGE', async () => {
      const api = await startApp();

      const { body } = await api
        .post('/probe/echo')
        .send({ name: 'x'.repeat(200_000) })
        .expect(413);

      expect(body).toMatchObject({
        statusCode: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Los datos enviados son demasiado grandes.',
      });
    });
  });

  it('un error interno responde 500 INTERNAL_ERROR sin revelar nada', async () => {
    const api = await startApp({ nodeEnv: 'production' });

    const { body } = await api
      .post('/probe/unvalidated')
      .send({ cualquier: 'cosa' })
      .expect(500);

    expect(body).toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message:
        'Algo salió mal de nuestro lado. Intenta de nuevo en unos minutos.',
    });
    expect(JSON.stringify(body)).not.toContain('@Body');
  });
});
