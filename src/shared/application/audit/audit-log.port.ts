import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';

/**
 * Dónde se registra la auditoría. Registrar nunca falla ni espera: quien audita un hecho no
 * puede quedar atado a que el registro funcione (un inicio de sesión no se rechaza porque el log
 * esté caído), así que cada adaptador maneja sus propias fallas.
 */
export interface AuditLog {
  /**
   * @param event - El hecho que se registra, con los datos personales ya enmascarados.
   */
  record(event: AuditEvent): void;
}
