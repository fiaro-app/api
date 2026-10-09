import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El Tenant no tiene suscripción. No debería pasar: todo negocio nace con una y la migración
 * les dio una a los que ya existían, así que solo ocurre si el alta se cayó a medias. Se responde
 * como no encontrado.
 */
export class SubscriptionNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(tenantId: string) {
    super(`El Tenant ${tenantId} no tiene suscripción.`);
  }
}
