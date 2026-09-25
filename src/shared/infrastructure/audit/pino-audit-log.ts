import { Logger } from '@nestjs/common';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';

/**
 * Escribe cada evento de auditoría como una línea de log en JSON, con `audit: true` para
 * filtrarlas (`{service="api"} | json | audit="true"` en Loki).
 *
 * @remarks
 * Es la copia que siempre está: sale por la salida estándar con el resto de los logs y no depende
 * de ningún otro servicio. Va por el logger de Nest, que ya es Pino, así que lleva el `service`
 * y el `requestId` como cualquier línea. Un nivel de log más alto que `info` (`LOG_LEVEL=warn`)
 * la silencia.
 */
export class PinoAuditLog implements AuditLog {
  private readonly logger = new Logger('Audit');

  /** @param event - El hecho que se registra. */
  record(event: AuditEvent): void {
    const { action, occurredAt, ...rest } = event;
    this.logger.log({
      msg: action,
      audit: true,
      event: action,
      occurredAt: occurredAt.toISOString(),
      ...rest,
    });
  }
}
