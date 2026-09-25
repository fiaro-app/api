import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

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
 * conexión se escriben en el log y no se propagan: `ioredis` reintenta solo, y un evento `error`
 * sin escuchar tumbaría el proceso.
 *
 * @param url - URL de Redis (`redis://` o `rediss://`).
 * @param role - Para qué se usa la conexión.
 */
export function createRedisConnection(url: string, role: RedisRole): Redis {
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
  const logger = new Logger(`Redis:${role}`);
  connection.on('error', (error: Error) => {
    logger.warn(`Conexión con Redis: ${error.message}`);
  });
  return connection;
}
