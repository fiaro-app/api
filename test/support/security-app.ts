import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, vi } from 'vitest';
import { AppModule } from '@/app.module.js';
import { configureApp } from '@/app.setup.js';
import { type Env, loadEnv } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import {
  ExplicitV1Controller,
  NeutralController,
  ProbeController,
  ProbeV2Controller,
} from '@test/support/security-probes.js';
import { testEnvSource } from '@test/support/test-env.js';

/** Origen que la aplicación de prueba deja llamar desde un navegador. */
export const ALLOWED_ORIGIN = 'https://app.fiaro.co';

/** Origen que no está en la lista. */
export const OTHER_ORIGIN = 'https://sitio-ajeno.example';

/**
 * Prepara el arranque de la aplicación ensamblada (`AppModule` y `configureApp`, como `main.ts`)
 * con rutas de prueba, y la cierra al terminar cada prueba. Se llama una vez por archivo, fuera de
 * las pruebas. El rate limit es alto salvo que `overrides` lo cambie.
 *
 * @returns Una función que levanta la aplicación y devuelve un cliente HTTP para ella.
 */
export function useSecurityApp() {
  let running: NestExpressApplication | undefined;

  afterEach(async () => {
    vi.unstubAllEnvs();
    await running?.close();
    running = undefined;
  });

  return async (overrides: Partial<Env> = {}) => {
    const env: Env = {
      ...loadEnv(
        testEnvSource({
          CORS_ORIGINS: ALLOWED_ORIGIN,
          SWAGGER_ENABLED: 'true',
          TRUST_PROXY: '0',
        }),
      ),
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

    running = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureApp(running);
    await running.init();
    return request(running.getHttpServer());
  };
}

/**
 * Petición con el método HTTP `QUERY`. Los tipos de supertest declaran `query()` como el de
 * superagent, aunque en ejecución crea el método `QUERY`.
 */
export function httpQuery(
  api: ReturnType<typeof request>,
  path: string,
): request.Test {
  return (
    api as unknown as Record<'query', (url: string) => request.Test>
  ).query(path);
}

/**
 * Estados de `count` peticiones enviadas una tras otra: el orden importa porque el contador del
 * rate limit avanza con cada una.
 */
export async function statusesOf(
  count: number,
  send: (index: number) => request.Test,
) {
  const statuses: number[] = [];
  for (let i = 0; i < count; i++) {
    statuses.push((await send(i)).status);
  }
  return statuses;
}
