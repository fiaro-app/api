import { Logger } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { MemorySignInAttempts } from '@/modules/auth/infrastructure/lockout/memory-sign-in-attempts.js';
import { RedisSignInAttempts } from '@/modules/auth/infrastructure/lockout/redis-sign-in-attempts.js';
import { createRedisConnection } from '@/shared/infrastructure/messaging/redis-connection.js';
import { repeatedWarnings } from '@/shared/infrastructure/messaging/repeated-warnings.js';

/**
 * Lo mismo que {@link createSignInAttempts}, pero para cualquier otro contador de intentos por
 * sujeto (pedir o canjear un código de recuperación, verificar un correo...): el mismo Redis si
 * está configurado, con su propio límite, ventana y prefijo de llave.
 *
 * @param env - Configuración validada: la URL de Redis y el prefijo de sus llaves.
 * @param keySuffix - Qué se está contando, para distinguir sus llaves de las de otros contadores.
 * @param maxAttempts - Intentos que pasan por ventana.
 * @param windowSeconds - Duración de la ventana.
 * @param loggerContext - Nombre del logger, para distinguir sus avisos de los de otros contadores.
 */
export function createAttemptCounter(
  env: Pick<Env, 'redisUrl' | 'queuePrefix'>,
  keySuffix: string,
  maxAttempts: number,
  windowSeconds: number,
  loggerContext: string,
): SignInAttempts {
  if (env.redisUrl === undefined) {
    return new MemorySignInAttempts(Date.now, maxAttempts, windowSeconds);
  }
  const warn = repeatedWarnings(new Logger(loggerContext));
  return new RedisSignInAttempts(
    createRedisConnection(env.redisUrl, 'producer', warn),
    `${env.queuePrefix}:${keySuffix}`,
    warn,
    maxAttempts,
    windowSeconds,
  );
}
