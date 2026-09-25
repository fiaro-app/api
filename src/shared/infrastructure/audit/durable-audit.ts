import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { MongoClient } from 'mongodb';
import type { Redis } from 'ioredis';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import type { AuditDocument } from '@/shared/infrastructure/audit/audit-document.js';
import { describeFailedJob } from '@/shared/infrastructure/audit/audit-job-failure.js';
import { createAuditJobProcessor } from '@/shared/infrastructure/audit/audit-job-processor.js';
import {
  AUDIT_COLLECTION,
  AUDIT_EVENTS_STREAM_MAX_LENGTH,
  AUDIT_JOB_OPTIONS,
  AUDIT_QUEUE_NAME,
  AUDIT_WORKER_OPTIONS,
  type AuditJobData,
} from '@/shared/infrastructure/audit/audit-queue.js';
import { MongoAuditStore } from '@/shared/infrastructure/audit/mongo-audit-store.js';
import { QueueAuditLog } from '@/shared/infrastructure/audit/queue-audit-log.js';
import { createRedisConnection } from '@/shared/infrastructure/messaging/redis-connection.js';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

/** Dónde vive la auditoría durable. */
export interface DurableAuditConfig {
  /** Redis donde vive la cola (`redis://` o `rediss://`). */
  readonly redisUrl: string;
  /** MongoDB donde se guardan los eventos, con el nombre de la base de datos. */
  readonly mongoUri: string;
  /** Prefijo de las llaves de la cola en Redis. */
  readonly queuePrefix: string;
}

/** Cuánto se espera a que el consumidor y la cola cierren al apagar la API. */
const CLOSE_TIMEOUT_MS = 10_000;

/**
 * La auditoría durable: la cola de BullMQ, el consumidor que lleva cada evento a MongoDB y las
 * conexiones que necesitan. Vive dentro de la API; si más adelante el consumidor se mueve a su
 * propio proceso, la cola y el documento no cambian.
 *
 * @remarks
 * Arrancar no espera a Redis ni a MongoDB: si no están, la API arranca igual (sus conexiones
 * reintentan solas y cada falla queda en el log), y los eventos salen de todos modos por
 * `PinoAuditLog`. Al apagar la API (`onModuleDestroy`) el consumidor termina el evento que tenga en
 * mano y se cierran las conexiones.
 */
export class DurableAudit implements OnModuleDestroy {
  private constructor(
    /** Donde se registran los eventos: los encola. */
    readonly log: AuditLog,
    private readonly queue: Queue<AuditJobData>,
    private readonly worker: Worker<AuditJobData>,
    private readonly redis: readonly Redis[],
    private readonly mongo: MongoClient,
  ) {}

  /**
   * Crea la cola, el consumidor y las conexiones, y los deja trabajando.
   *
   * @param config - Redis, MongoDB y prefijo de la cola.
   * @param ids - Generador de los identificadores de los eventos.
   */
  static start(config: DurableAuditConfig, ids: IdGenerator): DurableAudit {
    const logger = new Logger('AuditQueue');
    const producer = createRedisConnection(config.redisUrl, 'producer');
    const consumer = createRedisConnection(config.redisUrl, 'worker');
    const mongo = new MongoClient(config.mongoUri, {
      appName: 'fiaro-api',
      serverSelectionTimeoutMS: 5_000,
    });

    const queue = new Queue<AuditJobData>(AUDIT_QUEUE_NAME, {
      connection: producer,
      prefix: config.queuePrefix,
      defaultJobOptions: AUDIT_JOB_OPTIONS,
      streams: { events: { maxLen: AUDIT_EVENTS_STREAM_MAX_LENGTH } },
    });
    const store = new MongoAuditStore(
      mongo.db().collection<AuditDocument>(AUDIT_COLLECTION),
    );
    const worker = new Worker<AuditJobData>(
      AUDIT_QUEUE_NAME,
      createAuditJobProcessor(store),
      {
        ...AUDIT_WORKER_OPTIONS,
        connection: consumer,
        prefix: config.queuePrefix,
      },
    );

    queue.on('error', (error) => {
      logger.warn(`Cola de auditoría: ${error.message}`);
    });
    worker.on('error', (error) => {
      logger.warn(`Consumidor de la auditoría: ${error.message}`);
    });
    worker.on('failed', (job, error) => {
      const { level, message } = describeFailedJob(job, error);
      logger[level](message);
    });
    logger.log(
      `Auditoría durable activa: cola «${AUDIT_QUEUE_NAME}» → MongoDB «${AUDIT_COLLECTION}».`,
    );

    return new DurableAudit(
      new QueueAuditLog(queue, ids),
      queue,
      worker,
      [producer, consumer],
      mongo,
    );
  }

  /** Cierra el consumidor (termina lo que tenga en mano), la cola y las conexiones. */
  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      withTimeout(this.worker.close(), CLOSE_TIMEOUT_MS),
      withTimeout(this.queue.close(), CLOSE_TIMEOUT_MS),
    ]);
    for (const connection of this.redis) {
      connection.disconnect();
    }
    await this.mongo.close();
  }
}
