import type { JobsOptions, WorkerOptions } from 'bullmq';

/**
 * Nombre de la cola de registros en Redis: por ella pasan los eventos de auditoría y los lotes de
 * líneas de log, cada uno con su nombre de trabajo. Una sola cola y un solo consumidor, porque
 * cada consumidor consulta Redis aunque no haya trabajo y eso se cobra por comando.
 */
export const RECORDS_QUEUE_NAME = 'records';

/**
 * Cuántos eventos de la cola de eventos de BullMQ (`XADD`) se conservan. El valor por defecto
 * son 10 000: de sobra para un plan de Redis con memoria limitada.
 */
export const RECORDS_EVENTS_STREAM_MAX_LENGTH = 100;

/**
 * Cómo trabaja quien consume la cola. BullMQ consulta Redis aunque no haya trabajo, y un Redis
 * de pago por comando (Upstash) lo cobra: `drainDelay` alarga la espera bloqueante cuando la cola
 * está vacía y `stalledInterval` la revisión de trabajos atascados. `lockDuration` da un minuto
 * a cada trabajo antes de darlo por perdido.
 */
export const RECORDS_WORKER_OPTIONS = {
  concurrency: 5,
  drainDelay: 60,
  stalledInterval: 300_000,
  lockDuration: 60_000,
  maxStalledCount: 1,
} satisfies Partial<WorkerOptions>;

/**
 * Lo que quien registra algo necesita de la cola: encolar un trabajo. Con esta forma estrecha,
 * quien encola no conoce a BullMQ, y una prueba le pasa una cola falsa.
 */
export interface JobProducer<Data> {
  /**
   * Encola un trabajo.
   *
   * @param name - Nombre del trabajo: dice a qué consumidor le toca.
   * @param data - Lo que viaja por la cola, ya serializable a JSON.
   * @param options - Reintentos, retención y `jobId`.
   */
  add(name: string, data: Data, options: JobsOptions): Promise<unknown>;
}
