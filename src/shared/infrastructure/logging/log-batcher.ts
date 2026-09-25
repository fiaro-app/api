import type { DestinationStream } from 'pino';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import {
  LOG_BATCH_JOB_NAME,
  LOG_BATCH_JOB_OPTIONS,
  LOG_BATCH_LIMITS,
  type LogBatchJobData,
  type LogBatchLimits,
} from '@/shared/infrastructure/logging/log-batch.js';
import { toLogEntries } from '@/shared/infrastructure/logging/log-entry.js';
import { describeConnectionError } from '@/shared/infrastructure/messaging/describe-error.js';
import {
  ENQUEUE_TIMEOUT_MS,
  type JobProducer,
} from '@/shared/infrastructure/messaging/records-queue.js';
import type { Warn } from '@/shared/infrastructure/messaging/repeated-warnings.js';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

/** Aviso cuando se descartan líneas demasiado largas. */
const TOO_LONG_WARNING =
  'Se descartaron líneas de log demasiado largas para MongoDB; siguen saliendo por la salida estándar.';

/** Aviso cuando Redis no responde y ya hay demasiados lotes esperando. */
const TOO_MANY_PENDING_WARNING =
  'Redis no responde y hay lotes de líneas de log esperando: se descarta este lote para MongoDB; sus líneas siguen saliendo por la salida estándar.';

/**
 * Junta las líneas que escribe Pino y las envía a la cola de registros en lotes, de donde un
 * consumidor las guarda en MongoDB. Es un destino de logs (`write`) para ponerlo junto a la salida
 * estándar (`fanOutDestination`).
 *
 * @remarks
 * Es la copia de mejor esfuerzo del registro total: la salida estándar siempre tiene todas las
 * líneas; esta copia las hace consultables y las guarda 90 días. Por eso escribir es barato (un
 * `push`, sin leer el JSON) y nunca falla, y nada de lo que pase aquí frena a la petición:
 * - el lote se envía cuando pasa {@link LogBatchLimits.intervalMs} desde la primera línea guardada
 *   (no hay temporizador mientras no se escribe nada) o cuando junta demasiadas líneas o bytes;
 * - si Redis no responde en {@link ENQUEUE_TIMEOUT_MS} el lote se descarta y se avisa (una vez por
 *   minuto), no se reintenta ni se acumula;
 * - como BullMQ espera sin límite una conexión que no llega, se cuentan los lotes que esperan y,
 *   pasado {@link LogBatchLimits.maxInFlight}, se descartan: un Redis caído no llena la memoria;
 * - una línea de más de {@link LogBatchLimits.maxLineLength} no se guarda, y se avisa.
 *
 * Leer el JSON y quitar lo que no se guarda (`toLogEntries`) se hace al enviar, no por línea.
 * Los avisos de este mismo objeto son líneas de log y también pasan por aquí.
 */
export class LogBatcher implements DestinationStream {
  private lines: string[] = [];
  private bytes = 0;
  private tooLong = 0;
  private inFlight = 0;
  private timer: NodeJS.Timeout | undefined;
  private closed = false;

  /**
   * @param queue - La cola de registros.
   * @param ids - Generador de identificadores: cada lote lleva uno, que es el de su trabajo.
   * @param warn - Cómo se avisa una falla; conviene que no repita el mismo aviso (`repeatedWarnings`).
   * @param limits - Cuándo se envía un lote; por defecto {@link LOG_BATCH_LIMITS}.
   */
  constructor(
    private readonly queue: JobProducer<LogBatchJobData>,
    private readonly ids: IdGenerator,
    private readonly warn: Warn,
    private readonly limits: LogBatchLimits = LOG_BATCH_LIMITS,
  ) {}

  /** @param line - Una línea de log tal como la escribió Pino, JSON con salto de línea. */
  write(line: string): void {
    if (this.closed) {
      return;
    }
    if (line.length > this.limits.maxLineLength) {
      this.tooLong += 1;
      return;
    }
    this.lines.push(line);
    this.bytes += line.length;
    if (
      this.lines.length >= this.limits.maxLines ||
      this.bytes >= this.limits.maxBytes
    ) {
      void this.flush();
    } else {
      this.timer ??= setTimeout(() => {
        void this.flush();
      }, this.limits.intervalMs).unref();
    }
  }

  /**
   * Envía ahora las líneas guardadas. No falla: si no se puede encolar, se avisa y el lote se
   * descarta.
   */
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    const lines = this.lines;
    const tooLong = this.tooLong;
    this.lines = [];
    this.bytes = 0;
    this.tooLong = 0;
    if (tooLong > 0) {
      this.warn(TOO_LONG_WARNING);
    }
    const entries = toLogEntries(lines);
    if (entries.length === 0) {
      return;
    }
    if (this.inFlight >= this.limits.maxInFlight) {
      this.warn(TOO_MANY_PENDING_WARNING);
      return;
    }
    this.inFlight += 1;
    try {
      await withTimeout(
        this.queue.add(
          LOG_BATCH_JOB_NAME,
          { entries },
          { ...LOG_BATCH_JOB_OPTIONS, jobId: this.ids.next() },
        ),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.warn(
        `No se pudo encolar un lote de líneas de log para MongoDB: ${error instanceof Error ? describeConnectionError(error) : 'error desconocido'}. Siguen saliendo por la salida estándar.`,
      );
    } finally {
      this.inFlight -= 1;
    }
  }

  /** Envía lo que quede y deja de guardar líneas: se llama al apagar la API. */
  async close(): Promise<void> {
    this.closed = true;
    await this.flush();
  }
}
