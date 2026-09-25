import { Logger } from '@nestjs/common';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import { toAuditJobData } from '@/shared/infrastructure/audit/audit-document.js';
import {
  AUDIT_JOB_OPTIONS,
  type AuditJobData,
} from '@/shared/infrastructure/audit/audit-queue.js';
import type { JobProducer } from '@/shared/infrastructure/messaging/records-queue.js';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

/** Cuánto se espera a que Redis acepte un evento antes de darlo por no encolado. */
const ENQUEUE_TIMEOUT_MS = 3_000;

/** Cuántos eventos pueden estar esperando a Redis a la vez; los demás se descartan. */
const MAX_PENDING = 500;

/**
 * Manda cada evento de auditoría a la cola de BullMQ, de donde un consumidor lo lleva a MongoDB.
 *
 * @remarks
 * Cumple el contrato del puerto: `record` no espera ni falla. Encolar es una petición a Redis que
 * se hace por detrás; si Redis no responde en {@link ENQUEUE_TIMEOUT_MS} o rechaza el evento, se
 * escribe un error en el log (el evento ya salió por `PinoAuditLog`, la copia que siempre está) y
 * se sigue. Como BullMQ espera sin límite una conexión que no llega, se cuentan los eventos
 * pendientes y, pasado {@link MAX_PENDING}, se descartan: un Redis caído no llena la memoria. El
 * identificador del evento (el `jobId`) es el `_id` del documento en MongoDB.
 */
export class QueueAuditLog implements AuditLog {
  private pending = 0;

  /**
   * @param queue - La cola de registros.
   * @param ids - Generador de identificadores de eventos.
   * @param logger - Dónde se escriben las fallas.
   */
  constructor(
    private readonly queue: JobProducer<AuditJobData>,
    private readonly ids: IdGenerator,
    private readonly logger: Pick<Logger, 'error'> = new Logger('AuditQueue'),
  ) {}

  /** @param event - El hecho que se registra. */
  record(event: AuditEvent): void {
    if (this.pending >= MAX_PENDING) {
      this.logger.error(
        `Redis no responde y hay ${String(MAX_PENDING)} eventos de auditoría esperando: se descarta ${event.action}.`,
      );
      return;
    }
    this.pending += 1;
    void this.enqueue(event).finally(() => {
      this.pending -= 1;
    });
  }

  private async enqueue(event: AuditEvent): Promise<void> {
    try {
      await withTimeout(
        this.queue.add(event.action, toAuditJobData(event), {
          ...AUDIT_JOB_OPTIONS,
          jobId: this.ids.next(),
        }),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo encolar el evento de auditoría ${event.action}: ${error instanceof Error ? error.message : 'error desconocido'}.`,
      );
    }
  }
}
