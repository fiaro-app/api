import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import type { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';
import { currentRequestContext } from '@/shared/infrastructure/logging/request-context.js';

/** Desde dónde llegó la petición. */
export interface RequestOrigin {
  /** IP del cliente, la que resolvió Express. */
  readonly ip?: string;
  /** Navegador o app que la envió. */
  readonly userAgent?: string;
}

/** Qué sesiones cerró la persona: `others` (las demás) o `all` (todas, la actual incluida). */
export type RevocationScope = 'others' | 'all';

/** La persona de un evento de autenticación. */
export interface AuditedPerson {
  /** Su identificador. */
  readonly id: string;
  /** Su celular completo; la auditoría solo guarda el enmascarado. */
  readonly phone?: string;
}

/**
 * Convierte lo que pasa en las rutas de autenticación en eventos de auditoría: enmascara el
 * celular, agrega la petición y el momento, y los entrega al {@link AuditLog}.
 *
 * @remarks
 * Nunca recibe contraseñas, cookies ni tokens: los hooks de better-auth solo le pasan quién, qué
 * salió y desde dónde.
 */
export class AuthAuditor {
  /**
   * @param log - Dónde se registra.
   * @param masker - Enmascara el celular.
   * @param now - Reloj; en las pruebas es fijo.
   */
  constructor(
    private readonly log: AuditLog,
    private readonly masker: PersonalDataMasker,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Una persona inició sesión.
   *
   * @param person - Quién es.
   * @param mustChangePassword - Si entró con una contraseña temporal.
   * @param origin - Desde dónde entró.
   */
  signedIn(
    person: AuditedPerson,
    mustChangePassword: boolean,
    origin: RequestOrigin,
  ): void {
    this.record(
      {
        action: 'auth.sign_in.succeeded',
        outcome: 'SUCCESS',
        details: { mustChangePassword },
      },
      person,
      origin,
    );
  }

  /**
   * Se rechazó un intento de iniciar sesión.
   *
   * @param phone - El celular con el que se intentó, si el cuerpo lo traía.
   * @param reason - Código del error.
   * @param origin - Desde dónde se intentó.
   */
  signInFailed(
    phone: string | undefined,
    reason: string,
    origin: RequestOrigin,
  ): void {
    this.record(
      { action: 'auth.sign_in.failed', outcome: 'FAILURE', reason },
      phone === undefined ? undefined : { id: undefined, phone },
      origin,
    );
  }

  /**
   * Se rechazó un intento de iniciar sesión sin comprobar la contraseña: ese celular agotó los
   * intentos de su ventana.
   *
   * @param phone - El celular con el que se intentó.
   * @param retryAfterSeconds - Cuántos segundos faltan para que vuelva a tener intentos.
   * @param origin - Desde dónde se intentó.
   */
  signInLocked(
    phone: string,
    retryAfterSeconds: number,
    origin: RequestOrigin,
  ): void {
    this.record(
      {
        action: 'auth.sign_in.locked',
        outcome: 'FAILURE',
        reason: 'SIGN_IN_LOCKED',
        details: { retryAfterSeconds },
      },
      { phone },
      origin,
    );
  }

  /**
   * Una persona cerró su sesión.
   *
   * @param userId - Quién.
   * @param origin - Desde dónde.
   */
  signedOut(userId: string, origin: RequestOrigin): void {
    this.record(
      { action: 'auth.sign_out', outcome: 'SUCCESS' },
      { id: userId },
      origin,
    );
  }

  /**
   * Una persona cerró una de sus sesiones desde otra (revocar las demás o todas). Se avisa una vez
   * por cada sesión cerrada, con la misma petición: contar los eventos de una petición dice cuántas.
   *
   * @param userId - De quién era la sesión.
   * @param scope - Si pidió cerrar las demás o todas.
   * @param origin - Desde dónde lo pidió.
   */
  sessionRevoked(
    userId: string,
    scope: RevocationScope,
    origin: RequestOrigin,
  ): void {
    this.record(
      {
        action: 'auth.session.revoked',
        outcome: 'SUCCESS',
        details: { scope },
      },
      { id: userId },
      origin,
    );
  }

  /**
   * Una persona cambió su contraseña.
   *
   * @param person - Quién es.
   * @param origin - Desde dónde.
   */
  passwordChanged(person: AuditedPerson, origin: RequestOrigin): void {
    this.record(
      { action: 'auth.password.changed', outcome: 'SUCCESS' },
      person,
      origin,
    );
  }

  /**
   * Se rechazó un intento de cambiar la contraseña.
   *
   * @param person - Quién lo intentó, si se sabe.
   * @param reason - Código del error.
   * @param origin - Desde dónde.
   */
  passwordChangeFailed(
    person: AuditedPerson | undefined,
    reason: string,
    origin: RequestOrigin,
  ): void {
    this.record(
      { action: 'auth.password.change_failed', outcome: 'FAILURE', reason },
      person,
      origin,
    );
  }

  /**
   * Se pidió recuperar la contraseña de un celular por correo.
   *
   * @param phone - El celular con el que se pidió.
   * @param sent - Si el celular tiene cuenta con correo de contacto y se mandó el código.
   * @param origin - Desde dónde se pidió.
   */
  passwordResetRequested(
    phone: string,
    sent: boolean,
    origin: RequestOrigin,
  ): void {
    this.record(
      {
        action: 'auth.password.reset_requested',
        outcome: 'SUCCESS',
        details: { sent },
      },
      { phone },
      origin,
    );
  }

  /**
   * Se restableció la contraseña de un celular con un código de recuperación.
   *
   * @param person - Quién es.
   * @param origin - Desde dónde.
   */
  passwordResetCompleted(person: AuditedPerson, origin: RequestOrigin): void {
    this.record(
      { action: 'auth.password.reset_completed', outcome: 'SUCCESS' },
      person,
      origin,
    );
  }

  private record(
    fact: Pick<AuditEvent, 'action' | 'outcome' | 'reason' | 'details'>,
    person: { readonly id?: string; readonly phone?: string } | undefined,
    origin: RequestOrigin,
  ): void {
    this.log.record({
      ...fact,
      occurredAt: this.now(),
      userId: person?.id,
      phone:
        person?.phone === undefined
          ? undefined
          : this.masker.mask(person.phone),
      requestId: currentRequestContext()?.requestId,
      ip: origin.ip,
      userAgent: origin.userAgent,
    });
  }
}
