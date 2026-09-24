import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import type { Env } from '@/config/env.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import {
  advancedOptions,
  loggerOptions,
  passwordOptions,
  rateLimitOptions,
  sessionOptions,
  userOptions,
} from '@/modules/auth/infrastructure/better-auth/auth-options.js';
import { authHooks } from '@/modules/auth/infrastructure/better-auth/auth-hooks.js';
import {
  authPlugins,
  DISABLED_PATHS,
} from '@/modules/auth/infrastructure/better-auth/auth-plugins.js';
import { AUTH_BASE_PATH } from '@/modules/auth/infrastructure/better-auth/auth.constants.js';

/** Lo que necesita la factory de better-auth. */
export interface AuthDependencies {
  /** Configuración validada; solo lo que usa better-auth. */
  readonly env: Pick<Env, 'nodeEnv' | 'auth' | 'corsOrigins' | 'throttle'>;
  /** Cliente con el que better-auth lee y escribe en PostgreSQL. */
  readonly prisma: PrismaService;
  /** Generador de los identificadores de las filas que crea better-auth. */
  readonly ids: IdGenerator;
}

/**
 * Crea la instancia de better-auth: celular y contraseña, sesiones en PostgreSQL con Prisma y el
 * plugin de Expo para las apps móviles. No hay registro público: las personas se crean con
 * `CreateUserUseCase`. El detalle de cada bloque de opciones está en `auth-options.ts`.
 *
 * @param dependencies - Configuración validada, cliente de Prisma y generador de identificadores.
 */
export function createAuth({ env, prisma, ids }: AuthDependencies) {
  return betterAuth({
    appName: 'Fiaro',
    baseURL: env.auth.baseUrl,
    basePath: AUTH_BASE_PATH,
    secret: env.auth.secret,
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
      transaction: true,
    }),
    trustedOrigins: [...env.corsOrigins, ...env.auth.mobileOrigins],
    telemetry: { enabled: false },
    logger: loggerOptions(env.nodeEnv),
    emailAndPassword: passwordOptions,
    user: userOptions,
    session: sessionOptions,
    advanced: advancedOptions(ids),
    rateLimit: rateLimitOptions(env.throttle),
    plugins: [...authPlugins()],
    disabledPaths: [...DISABLED_PATHS],
    hooks: authHooks,
  });
}

/** Instancia de better-auth de la API. */
export type Auth = ReturnType<typeof createAuth>;
