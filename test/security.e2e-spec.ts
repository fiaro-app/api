import {
  Body,
  Controller,
  Get,
  Post,
  QueryMethod,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { type Env, loadEnv } from '../src/config/env.js';
import { ENV } from '../src/config/env.token.js';

const NoteSchema = z.strictObject({
  name: z.string().min(1),
  amount: z.int().min(1).default(1),
});
const SearchSchema = z.strictObject({ text: z.string().default('') });

/** Rutas de la versión 1: no declaran versión y heredan la de por defecto. */
@Controller('probe')
class ProbeController {
  @Get('ping')
  ping() {
    return { version: 1 };
  }

  /** Existe solo en la versión 1. */
  @Get('other')
  other() {
    return { other: true };
  }

  @Get('cookies')
  cookies(@Req() req: Request) {
    return req.cookies as Record<string, string>;
  }

  @Post('echo')
  echo(@Body({ schema: NoteSchema }) body: z.output<typeof NoteSchema>) {
    return body;
  }

  @Post('unvalidated')
  unvalidated(@Body() body: unknown) {
    return body;
  }

  @QueryMethod('search')
  search(@Body({ schema: SearchSchema }) body: z.output<typeof SearchSchema>) {
    return { got: body };
  }
}

/** Ruta que declara la versión 1 de forma explícita. */
@Controller({ path: 'probe', version: '1' })
class ExplicitV1Controller {
  @Get('explicit-v1')
  get() {
    return { explicit: true };
  }
}

/** Versión 2 de `ProbeController.ping`. */
@Controller({ path: 'probe', version: '2' })
class ProbeV2Controller {
  @Get('ping')
  ping() {
    return { version: 2 };
  }
}

@Controller({ path: 'neutral', version: VERSION_NEUTRAL })
class NeutralController {
  @Get()
  get() {
    return { neutral: true };
  }
}

const ALLOWED_ORIGIN = 'https://app.fiaro.co';
const OTHER_ORIGIN = 'https://sitio-ajeno.example';

let app: NestExpressApplication | undefined;

/**
 * Levanta la aplicación ensamblada (`AppModule` y `configureApp`, como `main.ts`).
 * El rate limit es alto salvo que `overrides` lo cambie.
 */
async function startApp(overrides: Partial<Env> = {}) {
  const env: Env = {
    ...loadEnv({
      NODE_ENV: 'test',
      CORS_ORIGINS: ALLOWED_ORIGIN,
      SWAGGER_ENABLED: 'true',
    }),
    throttle: { ttlMs: 60_000, limit: 10_000 },
    ...overrides,
  };
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [
      ProbeController,
      ExplicitV1Controller,
      ProbeV2Controller,
      NeutralController,
    ],
  })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();

  app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return request(app.getHttpServer());
}

/**
 * Petición con el método HTTP `QUERY`. Los tipos de supertest declaran `query()` como el de
 * superagent, aunque en ejecución crea el método `QUERY`.
 */
function httpQuery(
  api: ReturnType<typeof request>,
  path: string,
): request.Test {
  return (
    api as unknown as Record<'query', (url: string) => request.Test>
  ).query(path);
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await app?.close();
  app = undefined;
});

describe('cabeceras de seguridad', () => {
  it('las rutas de la API responden con la política estricta', async () => {
    const api = await startApp();

    const { headers } = await api.get('/probe/ping').expect(200);

    expect(headers['content-security-policy']).toBe(
      "default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'",
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('la documentación tiene su propia política, más abierta', async () => {
    const api = await startApp();

    const { headers } = await api.get('/docs').expect(200);

    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).not.toContain(
      "default-src 'none'",
    );
  });
});

describe('CORS', () => {
  it('acepta el preflight de QUERY con la cabecera de versión desde un origen permitido', async () => {
    const api = await startApp();

    const { headers } = await api
      .options('/probe/search')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'QUERY')
      .set('Access-Control-Request-Headers', 'content-type, api-version')
      .expect(204);

    expect(headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(headers['access-control-allow-methods']).toContain('QUERY');
    expect(headers['access-control-allow-headers']).toContain('Content-Type');
    expect(headers['access-control-allow-headers']).toContain('API-Version');
    expect(headers['access-control-allow-credentials']).toBe('true');
    expect(headers['access-control-max-age']).toBe('600');
  });

  it('expone a la web las cabeceras de reintento', async () => {
    const api = await startApp();

    const { headers } = await api
      .get('/probe/ping')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    expect(headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(headers['access-control-expose-headers']).toContain('Retry-After');
  });

  it('no autoriza a un origen que no está en la lista', async () => {
    const api = await startApp();

    const preflight = await api
      .options('/probe/search')
      .set('Origin', OTHER_ORIGIN)
      .set('Access-Control-Request-Method', 'QUERY');
    const simple = await api.get('/probe/ping').set('Origin', OTHER_ORIGIN);

    expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
    expect(simple.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('no envía cabeceras CORS si no hay orígenes configurados', async () => {
    const api = await startApp({ corsOrigins: [] });

    const { headers } = await api
      .get('/probe/ping')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    expect(headers['access-control-allow-origin']).toBeUndefined();
    expect(headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('no afecta a quien no es un navegador (apps móviles, curl)', async () => {
    const api = await startApp();

    const { headers } = await api.get('/probe/ping').expect(200);

    expect(headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('cookies', () => {
  it('lee las cookies de la petición en req.cookies', async () => {
    const api = await startApp();

    const { body } = await api
      .get('/probe/cookies')
      .set('Cookie', 'session=abc123; theme=dark')
      .expect(200);

    expect(body).toEqual({ session: 'abc123', theme: 'dark' });
  });
});

describe('versionado por cabecera', () => {
  it('sin cabecera sirve la versión por defecto: las apps ya instaladas no la envían', async () => {
    const api = await startApp();

    const { body } = await api.get('/probe/ping').expect(200);

    expect(body).toEqual({ version: 1 });
  });

  it('las rutas no llevan prefijo de versión', async () => {
    const api = await startApp();

    await api.get('/v1/probe/ping').expect(404);
  });

  it('la cabecera elige la versión', async () => {
    const api = await startApp();

    const v1 = await api.get('/probe/ping').set('API-Version', '1').expect(200);
    const v2 = await api.get('/probe/ping').set('API-Version', '2').expect(200);

    expect(v1.body).toEqual({ version: 1 });
    expect(v2.body).toEqual({ version: 2 });
  });

  it('una ruta que declara la versión 1 también responde sin cabecera', async () => {
    const api = await startApp();

    await api.get('/probe/explicit-v1').expect(200);
    await api.get('/probe/explicit-v1').set('API-Version', '1').expect(200);
  });

  it('una versión que la ruta no tiene responde 404', async () => {
    const api = await startApp();

    await api.get('/probe/ping').set('API-Version', '9').expect(404);
    await api.get('/probe/other').set('API-Version', '2').expect(404);
  });

  it('las rutas VERSION_NEUTRAL responden con cualquier versión y sin ella', async () => {
    const api = await startApp();

    await api.get('/neutral').expect(200);
    await api.get('/neutral').set('API-Version', '9').expect(200);
  });

  it('avisa a las caches con Vary de que la respuesta depende de la versión', async () => {
    const api = await startApp();

    const { headers } = await api.get('/probe/ping').expect(200);

    expect(headers.vary).toContain('API-Version');
  });
});

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

  it('rechaza los campos que el contrato no declara', async () => {
    const api = await startApp();

    const { body } = await api
      .post('/probe/echo')
      .send({ name: 'Ana', role: 'admin' })
      .expect(400);

    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.issues[0].message).toContain('role');
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

describe('rate limit', () => {
  const limit = 3;
  const throttle = { ttlMs: 60_000, limit };

  it('bloquea con 429 y Retry-After al pasar el límite', async () => {
    const api = await startApp({ throttle });

    for (let i = 0; i < limit; i++) {
      await api.get('/probe/ping').expect(200);
    }
    const blocked = await api.get('/probe/ping').expect(429);

    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body.message).toContain('Demasiadas solicitudes');
  });

  it('informa el límite y lo que queda en cada respuesta', async () => {
    const api = await startApp({ throttle });

    const first = await api.get('/probe/ping').expect(200);
    const second = await api.get('/probe/ping').expect(200);

    expect(first.headers['x-ratelimit-limit']).toBe('3');
    expect(first.headers['x-ratelimit-remaining']).toBe('2');
    expect(second.headers['x-ratelimit-remaining']).toBe('1');
  });

  it('cuenta por ruta: agotar una no bloquea las demás', async () => {
    const api = await startApp({ throttle });

    for (let i = 0; i <= limit; i++) {
      await api.get('/probe/ping');
    }

    await api.get('/probe/ping').expect(429);
    await api.get('/probe/other').expect(200);
  });

  it('no cuenta los preflight de CORS', async () => {
    const api = await startApp({ throttle });

    for (let i = 0; i < limit * 2; i++) {
      await api
        .options('/probe/search')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'QUERY')
        .expect(204);
    }

    for (let i = 0; i < limit; i++) {
      await api.get('/probe/ping').expect(200);
    }
    await api.get('/probe/ping').expect(429);
  });

  it('sin proxy de confianza ignora X-Forwarded-For, que cualquiera puede falsificar', async () => {
    const api = await startApp({ throttle, trustProxy: 0 });

    for (let i = 0; i < limit; i++) {
      await api
        .get('/probe/ping')
        .set('X-Forwarded-For', `203.0.113.${String(i + 1)}`)
        .expect(200);
    }

    await api
      .get('/probe/ping')
      .set('X-Forwarded-For', '203.0.113.99')
      .expect(429);
  });

  it('detrás de un proxy de confianza cuenta a cada cliente por separado', async () => {
    const api = await startApp({ throttle, trustProxy: 1 });

    for (let i = 0; i < limit; i++) {
      await api
        .get('/probe/ping')
        .set('X-Forwarded-For', '203.0.113.1')
        .expect(200);
    }
    await api
      .get('/probe/ping')
      .set('X-Forwarded-For', '203.0.113.1')
      .expect(429);

    await api
      .get('/probe/ping')
      .set('X-Forwarded-For', '203.0.113.2')
      .expect(200);
  });
});

describe('documentación', () => {
  it('publica la interfaz y el documento OpenAPI con las rutas sin prefijo', async () => {
    const api = await startApp();

    await api.get('/docs').expect(200);
    const { body } = await api.get('/docs/openapi.json').expect(200);

    expect(body.openapi).toBe('3.2.0');
    expect(body.paths['/probe/ping'].get).toBeDefined();
    expect(body.paths['/probe/search'].query).toBeDefined();
    expect(body.paths['/neutral'].get).toBeDefined();
    expect(body.paths['/v1/probe/ping']).toBeUndefined();
  });

  it('describe el body de cada ruta con el schema de su contrato', async () => {
    const api = await startApp();

    const { body } = await api.get('/docs/openapi.json').expect(200);

    const schema =
      body.paths['/probe/echo'].post.requestBody.content['application/json']
        .schema;
    expect(schema.required).toEqual(['name']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('no se publica cuando está desactivada', async () => {
    const api = await startApp({ swaggerEnabled: false });

    await api.get('/docs').expect(404);
    await api.get('/docs/openapi.json').expect(404);
  });
});

describe('arranque', () => {
  it('no arranca con una variable de entorno inválida', async () => {
    vi.stubEnv('PORT', 'abc');

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow(/PORT/);
  });
});
