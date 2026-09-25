import { Logger } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { MemorySignInAttempts } from '@/modules/auth/infrastructure/lockout/memory-sign-in-attempts.js';
import { RedisSignInAttempts } from '@/modules/auth/infrastructure/lockout/redis-sign-in-attempts.js';
import { createRedisConnection } from '@/shared/infrastructure/messaging/redis-connection.js';
import { repeatedWarnings } from '@/shared/infrastructure/messaging/repeated-warnings.js';

/**
 * Elige dónde se cuentan los intentos de iniciar sesión: en Redis si está configurado (así todas
 * las instancias cuentan lo mismo) y, si no, en la memoria del proceso.
 *
 * @param env - Configuración validada: la URL de Redis y el prefijo de sus llaves.
 */
export function createSignInAttempts(
  env: Pick<Env, 'redisUrl' | 'queuePrefix'>,
): SignInAttempts {
  if (env.redisUrl === undefined) {
    return new MemorySignInAttempts();
  }
  const warn = repeatedWarnings(new Logger('SignInAttempts'));
  return new RedisSignInAttempts(
    createRedisConnection(env.redisUrl, 'producer', warn),
    `${env.queuePrefix}:sign-in-attempts`,
    warn,
  );
}
