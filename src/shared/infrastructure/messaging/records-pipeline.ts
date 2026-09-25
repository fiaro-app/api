import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { type Job, Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { type Db, MongoClient } from 'mongodb';
import { describeConnectionError } from '@/shared/infrastructure/messaging/describe-error.js';
import { describeFailedJob } from '@/shared/infrastructure/messaging/job-failure.js';
import {
  RECORDS_EVENTS_STREAM_MAX_LENGTH,
  RECORDS_QUEUE_NAME,
  RECORDS_WORKER_OPTIONS,
} from '@/shared/infrastructure/messaging/records-queue.js';
import { createRedisConnection } from '@/shared/infrastructure/messaging/redis-connection.js';
import { repeatedWarnings } from '@/shared/infrastructure/messaging/repeated-warnings.js';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

/** Dónde vive la tubería de registros. */
export interface RecordsPipelineConfig {
  /** Redis donde vive la cola (`redis://` o `rediss://`). */
  readonly redisUrl: string;
  /** MongoDB donde se guardan los registros, con el nombre de la base de datos. */
  readonly mongoUri: string;
  /** Prefijo de las llaves de la cola en Redis. */
  readonly queuePrefix: string;
}

/** Lo que hace el consumidor con cada trabajo. Si falla, el error sube y BullMQ reintenta. */
export type JobProcessor = (job: Job) => Promise<void>;

/** Cuánto se espera a que el consumidor y la cola cierren al apagar la API. */
const CLOSE_TIMEOUT_MS = 10_000;

/**
 * La tubería de registros: la cola de BullMQ, el consumidor que lleva cada trabajo a MongoDB y las
 * conexiones que necesitan. Por ella pasan los eventos de auditoría y los lotes de líneas de log;
 * quién es cada trabajo y dónde se guarda lo decide el `JobProcessor` que se le da al arrancar.
 * Vive dentro de la API; si más adelante el consumidor se mueve a su propio proceso, la cola y los
 * documentos no cambian.
 *
 * @remarks
 * Arrancar no espera a Redis ni a MongoDB: si no están, la API arranca igual (sus conexiones
 * reintentan solas y las fallas quedan en el log, sin repetir el mismo aviso en cada reintento).
 * Al apagar la API (`onModuleDestroy`) primero corren los ganchos de `onBeforeClose` (lo que
 * todavía tiene que encolar), después el consumidor termina el trabajo que tenga en mano y se
 * cierran las conexiones.
 */
export class RecordsPipeline implements OnModuleDestroy {
  private readonly beforeClose: (() => Promise<void>)[] = [];

  private constructor(
    /** La cola: quien registra algo encola aquí un trabajo con su nombre. */
    readonly queue: Queue,
    private readonly worker: Worker,
    private readonly redis: readonly Redis[],
    private readonly mongo: MongoClient,
  ) {}

  /**
   * Crea la cola, el consumidor y las conexiones, y los deja trabajando.
   *
   * @param config - Redis, MongoDB y prefijo de la cola.
   * @param createProcessor - Arma lo que hace el consumidor con cada trabajo, a partir de la base
   * de datos donde se guarda.
   */
  static start(
    config: RecordsPipelineConfig,
    createProcessor: (database: Db) => JobProcessor,
  ): RecordsPipeline {
    const logger = new Logger('RecordsQueue');
    const warn = repeatedWarnings(logger);
    const producer = createRedisConnection(config.redisUrl, 'producer', warn);
    const consumer = createRedisConnection(config.redisUrl, 'worker', warn);
    const mongo = new MongoClient(config.mongoUri, {
      appName: 'fiaro-api',
      serverSelectionTimeoutMS: 5_000,
    });

    const queue = new Queue(RECORDS_QUEUE_NAME, {
      connection: producer,
      prefix: config.queuePrefix,
      streams: { events: { maxLen: RECORDS_EVENTS_STREAM_MAX_LENGTH } },
    });
    const worker = new Worker(RECORDS_QUEUE_NAME, createProcessor(mongo.db()), {
      ...RECORDS_WORKER_OPTIONS,
      connection: consumer,
      prefix: config.queuePrefix,
    });

    queue.on('error', (error) => {
      warn(`Cola de registros: ${describeConnectionError(error)}`);
    });
    worker.on('error', (error) => {
      warn(
        `Consumidor de la cola de registros: ${describeConnectionError(error)}`,
      );
    });
    worker.on('failed', (job, error) => {
      const { level, message } = describeFailedJob(job, error);
      logger[level](message);
    });
    logger.log(`Cola de registros «${RECORDS_QUEUE_NAME}» activa.`);

    return new RecordsPipeline(queue, worker, [producer, consumer], mongo);
  }

  /**
   * Registra algo que debe correr al apagar la API, antes de cerrar la cola: quien guarda cosas en
   * memoria para encolarlas después de un rato las encola aquí por última vez.
   *
   * @param hook - Lo que se ejecuta. Si falla, no impide cerrar el resto.
   */
  onBeforeClose(hook: () => Promise<void>): void {
    this.beforeClose.push(hook);
  }

  /** Corre los ganchos de cierre, cierra el consumidor (termina lo que tenga en mano), la cola y las conexiones. */
  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.beforeClose.map((hook) => hook()));
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
