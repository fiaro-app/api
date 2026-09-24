import { Controller, Get } from '@nestjs/common';
import { afterEach, expect } from 'vitest';
import type { Response } from 'supertest';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import { CurrentUser } from '@/shared/infrastructure/http/current-user.decorator.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import {
  startTestApp,
  type TestApp,
  type TestAppOptions,
} from '@test/support/test-app.js';

/** Rutas de prueba: una protegida (por defecto) y una pública. */
@Controller('probe')
export class ProbeController {
  @Get('whoami')
  whoami(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Get('open')
  open() {
    return { open: true };
  }
}

export const PHONE = '+573001234567';
export const PASSWORD = 'contraseña-de-prueba-1';
export const APP_ORIGIN = 'https://app.fiaro.co';
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Levanta la aplicación con la persona de prueba ya creada. Cada prueba parte de una base de
 * datos vacía y de una aplicación nueva.
 */
export async function createAppWithUser(
  options: {
    mustChangePassword?: boolean;
    env?: NodeJS.ProcessEnv;
    overrides?: TestAppOptions['overrides'];
  } = {},
): Promise<TestApp> {
  const app = await startTestApp({
    controllers: [ProbeController],
    env: { CORS_ORIGINS: APP_ORIGIN, ...options.env },
    overrides: options.overrides,
  });
  await app.createUser({
    phone: PHONE,
    fullName: 'Ana Pérez',
    password: PASSWORD,
    mustChangePassword: options.mustChangePassword,
  });
  return app;
}

let ipSeed = 0;

/**
 * Una IP distinta en cada llamada. El rate limit de better-auth cuenta en memoria del proceso y
 * lo comparten todas las pruebas: sin una IP propia, los inicios de sesión de una prueba
 * gastarían el límite de la siguiente.
 */
export function nextIp(): string {
  ipSeed += 1;
  return `10.20.${String(Math.trunc(ipSeed / 250))}.${String((ipSeed % 250) + 1)}`;
}

export function signIn(
  app: TestApp,
  credentials: { phone?: string; password?: string; ip?: string } = {},
) {
  return app.http
    .post('/auth/sign-in/phone-number')
    .set('X-Forwarded-For', credentials.ip ?? nextIp())
    .send({
      phoneNumber: credentials.phone ?? PHONE,
      password: credentials.password ?? PASSWORD,
    });
}

/** El valor de la cabecera `Cookie` que enviaría la app con lo que respondió el servidor. */
export function cookieOf(response: Response): string {
  const setCookie = response.headers['set-cookie'] as unknown as string[];
  return setCookie.map((cookie) => cookie.split(';')[0]).join('; ');
}

/** Inicia sesión y devuelve la cookie de esa sesión. */
export async function login(
  app: TestApp,
  password = PASSWORD,
): Promise<string> {
  const response = await signIn(app, { password });
  expect(response.status).toBe(200);
  return cookieOf(response);
}

export const whoami = (app: TestApp, cookie?: string) => {
  const req = app.http.get('/probe/whoami');
  return cookie ? req.set('Cookie', cookie) : req;
};

/**
 * Prepara el arranque de la aplicación de las pruebas de autenticación y la cierra al terminar
 * cada prueba. Se llama una vez por archivo, fuera de las pruebas.
 *
 * @returns `startWithUser` levanta la aplicación con la persona de prueba ya creada;
 * `startEmpty`, sin usuarios.
 */
export function useAuthApp() {
  let running: TestApp | undefined;

  afterEach(async () => {
    await running?.close();
    running = undefined;
  });

  return {
    startWithUser: async (
      options: Parameters<typeof createAppWithUser>[0] = {},
    ): Promise<TestApp> => {
      running = await createAppWithUser(options);
      return running;
    },
    startEmpty: async (): Promise<TestApp> => {
      running = await startTestApp();
      return running;
    },
  };
}
