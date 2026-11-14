import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El servicio está en una ventana de mantenimiento declarada por operaciones (D-90):
 * `GET /health` responde 503 mientras `MAINTENANCE_MODE` siga activo, para que Fly.io saque la
 * instancia de circulación sin tocar ninguna otra ruta.
 */
export class MaintenanceModeError extends DomainError {
  readonly code = 'MAINTENANCE';
  readonly errorCode = 'W001H';
  readonly kind: DomainErrorKind = 'UNAVAILABLE';

  constructor() {
    super('El servicio está en mantenimiento.');
  }
}
