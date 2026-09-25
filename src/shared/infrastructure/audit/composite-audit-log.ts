import { Logger } from '@nestjs/common';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';

/**
 * Registra cada evento en varios lugares a la vez: la línea de log que siempre está y, si está
 * configurada, la cola que lo lleva a MongoDB.
 *
 * @remarks
 * Un destino que falla no impide que los demás reciban el evento ni rechaza la petición que lo
 * causó: el error se escribe en el log y se sigue.
 */
export class CompositeAuditLog implements AuditLog {
  private readonly logger = new Logger('Audit');

  /** @param logs - Los destinos, en el orden en que se avisa a cada uno. */
  constructor(private readonly logs: readonly AuditLog[]) {}

  /** @param event - El hecho que se registra. */
  record(event: AuditEvent): void {
    for (const log of this.logs) {
      try {
        log.record(event);
      } catch (error) {
        this.logger.error(
          `Un destino de la auditoría falló con ${event.action}: ${error instanceof Error ? error.message : 'error desconocido'}.`,
        );
      }
    }
  }
}
