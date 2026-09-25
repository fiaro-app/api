import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import type { AuditJobData } from '@/shared/infrastructure/audit/audit-queue.js';

/** El evento como se guarda en MongoDB. */
export interface AuditDocument extends Omit<AuditEvent, 'occurredAt'> {
  /** Identificador del evento: el del trabajo de la cola, así guardarlo dos veces no lo duplica. */
  readonly _id: string;
  /** Cuándo pasó; el índice TTL cuenta el año de retención desde aquí. */
  readonly occurredAt: Date;
  /** Cuándo llegó a MongoDB, para medir cuánto tarda la cola. */
  readonly recordedAt: Date;
}

/**
 * Convierte el evento que viajó por la cola en el documento que se guarda.
 *
 * @param id - Identificador del trabajo de la cola.
 * @param data - El evento, con la fecha como texto.
 * @param recordedAt - Cuándo se guarda.
 */
export function toAuditDocument(
  id: string,
  data: AuditJobData,
  recordedAt: Date,
): AuditDocument {
  return {
    ...data,
    _id: id,
    occurredAt: new Date(data.occurredAt),
    recordedAt,
  };
}

/**
 * Convierte un evento en lo que viaja por la cola: la misma información, con la fecha como texto.
 *
 * @param event - El evento.
 */
export function toAuditJobData(event: AuditEvent): AuditJobData {
  return { ...event, occurredAt: event.occurredAt.toISOString() };
}
