import { Redis } from 'ioredis';
import { describeConnectionError } from '@/shared/infrastructure/messaging/describe-error.js';
import type { Warn } from '@/shared/infrastructure/messaging/repeated-warnings.js';

/** Para qué se abre la conexión: BullMQ pide opciones distintas a quien encola y a quien consume. */
export type RedisRole = 'producer' | 'worker';

/** Tiempo máximo para establecer la conexión con Redis. */
const CONNECT_TIMEOUT_MS = 5_000;

/**
 * Abre una conexión a Redis para BullMQ.
 *
 * @remarks
 * Quien consume (`worker`) usa comandos que bloquean y BullMQ exige `maxRetriesPerRequest: null`.
 * Quien encola (`producer`) falla rápido: sin cola offline y con un solo reintento por comando,
 * así un Redis caído devuelve un error en lugar de acumular comandos en memoria. Los errores de
 * conexión se avisan (`warn`) y no se propagan: `ioredis` reintenta solo, y un evento `error`
 * sin escuchar tumbaría el proceso.
 *
 * @param url - URL de Redis (`redis://` o `rediss://`).
 * @param role - Para qué se usa la conexión.
 * @param warn - Cómo se avisa un error de conexión; conviene que no repita el mismo aviso en
 * cada reintento (`repeatedWarnings`).
 */
export function createRedisConnection(
  url: string,
  role: RedisRole,
  warn: Warn,
): Redis {
  const connection = new Redis(
    url,
    role === 'worker'
      ? { maxRetriesPerRequest: null, connectTimeout: CONNECT_TIMEOUT_MS }
      : {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: CONNECT_TIMEOUT_MS,
        },
  );
  connection.on('error', (error: Error) => {
    warn(`Conexión con Redis (${role}): ${describeConnectionError(error)}`);
  });
  return connection;
}
