import { randomBytes } from 'node:crypto';
import { Redis } from 'ioredis';
import { type Collection, MongoClient } from 'mongodb';
import type { AuditDocument } from '@/shared/infrastructure/audit/audit-document.js';
import { AUDIT_COLLECTION } from '@/shared/infrastructure/audit/audit-queue.js';
import { LOG_COLLECTION } from '@/shared/infrastructure/logging/log-batch.js';
import type { LogDocument } from '@/shared/infrastructure/logging/log-document.js';

/** Redis y MongoDB del entorno de desarrollo (`pnpm docker:infra`), si el entorno no dice otra cosa. */
const DEV_REDIS_URL = 'redis://127.0.0.1:6390';
const DEV_MONGODB_URI =
  'mongodb://fiaro:fiaro@127.0.0.1:27040/fiaro?authSource=admin';

const withDatabase = (uri: string, database: string): string => {
  const url = new URL(uri);
  url.pathname = `/${database}`;
  return url.toString();
};

/** La infraestructura de una prueba de la auditoría durable, aislada de las demás corridas. */
export interface DurableAuditInfra {
  /** Variables de entorno que encienden la auditoría durable contra esta infraestructura. */
  readonly env: NodeJS.ProcessEnv;
  /** La colección donde la API guarda los eventos de auditoría. */
  readonly events: Collection<AuditDocument>;
  /** La colección donde la API guarda las líneas de log. */
  readonly logs: Collection<LogDocument>;
  /** Un prefijo de cola propio, para una prueba que no debe compartir la cola con las demás. */
  ownQueuePrefix(name: string): string;
  /** Borra la base de datos y las llaves de cola de esta corrida. */
  close(): Promise<void>;
}

/**
 * Prepara Redis y MongoDB para probar la auditoría durable sin tocar los datos de desarrollo ni
 * cruzarse con otras corridas: una base de datos de MongoDB y un prefijo de cola propios, que se
 * borran al terminar. Si el servidor de desarrollo tiene la API corriendo, sus consumidores
 * (que leen otro prefijo) no ven estos eventos.
 */
export async function startDurableAuditInfra(): Promise<DurableAuditInfra> {
  const suffix = randomBytes(6).toString('hex');
  const redisUrl = process.env.REDIS_URL ?? DEV_REDIS_URL;
  const mongoUri = withDatabase(
    process.env.MONGODB_URI ?? DEV_MONGODB_URI,
    `fiaro_e2e_${suffix}`,
  );
  const prefix = `fiaro-e2e-${suffix}`;
  const prefixes = [prefix];

  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 3_000 });
  try {
    await mongo.connect();
  } catch (error) {
    throw new Error(
      `No se pudo conectar a MongoDB. Levanta la infraestructura con \`pnpm docker:infra\`. (${(error as Error).message})`,
      { cause: error },
    );
  }

  return {
    env: { REDIS_URL: redisUrl, MONGODB_URI: mongoUri, QUEUE_PREFIX: prefix },
    events: mongo.db().collection<AuditDocument>(AUDIT_COLLECTION),
    logs: mongo.db().collection<LogDocument>(LOG_COLLECTION),
    ownQueuePrefix(name) {
      const own = `${prefix}-${name}`;
      prefixes.push(own);
      return own;
    },
    async close() {
      await mongo.db().dropDatabase();
      await mongo.close();
      const redis = new Redis(redisUrl);
      for (const queuePrefix of prefixes) {
        for await (const keys of redis.scanStream({
          match: `${queuePrefix}:*`,
        })) {
          if ((keys as string[]).length > 0) {
            await redis.del(...(keys as string[]));
          }
        }
      }
      await redis.quit();
    },
  };
}
