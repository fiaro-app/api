/**
 * Lo que la auditoría registra, con el nombre `<módulo>.<recurso>.<hecho>`. Cada módulo agrega los
 * suyos a medida que se construye.
 */
export const AUDIT_ACTIONS = [
  /** Una persona inició sesión. */
  'auth.sign_in.succeeded',
  /** Un intento de iniciar sesión fue rechazado (contraseña incorrecta, celular sin cuenta...). */
  'auth.sign_in.failed',
  /** Un intento de iniciar sesión fue rechazado sin comprobar la contraseña: ese celular agotó sus intentos. */
  'auth.sign_in.locked',
  /** Una persona cerró su sesión. */
  'auth.sign_out',
  /** Una persona cerró desde una sesión otra sesión suya (revocar las demás o todas). Un evento por cada una. */
  'auth.session.revoked',
  /** Una persona cambió su contraseña. */
  'auth.password.changed',
  /** Un intento de cambiar la contraseña fue rechazado (la actual no era correcta). */
  'auth.password.change_failed',
  /** Se pidió recuperar la contraseña de un celular por correo. */
  'auth.password.reset_requested',
  /** Se restableció la contraseña de un celular con un código de recuperación. */
  'auth.password.reset_completed',
  /** Se pidió verificar el correo de contacto de la persona. */
  'auth.email.verification_requested',
  /** Se verificó el correo de contacto de la persona. */
  'auth.email.verified',
  /** Se actualizó el nombre o el correo de contacto de la persona. */
  'auth.profile.updated',
  /** Se desactivó la cuenta de la persona. */
  'auth.account.deactivated',
  /** Se creó una orden de pago de la suscripción (la dueña va a pagar en Wompi). */
  'billing.checkout.created',
  /** Wompi aprobó un pago y se aplicó a la suscripción. */
  'billing.payment.approved',
  /** Wompi cerró un pago sin aprobarlo (rechazado, anulado o con error). */
  'billing.payment.not_approved',
  /** Se importaron clientes y préstamos desde una hoja de cálculo (D-152). */
  'imports.batch.completed',
  /** Un aviso de Wompi no se aplicó: firma inválida, referencia desconocida o monto distinto. */
  'billing.webhook.rejected',
] as const;

/** Lo que pasó: uno de {@link AUDIT_ACTIONS}. */
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Si lo que se intentó salió bien o fue rechazado. */
export type AuditOutcome = 'SUCCESS' | 'FAILURE';

/**
 * Un dato personal que la auditoría no guarda: solo sus últimos 4 caracteres, para reconocerlo a
 * simple vista, y un hash con clave, para seguir a la misma persona entre eventos sin poder
 * revertirlo.
 */
export interface MaskedValue {
  /** Los últimos 4 caracteres del dato. */
  readonly last4: string;
  /** Huella del dato completo: el mismo dato da siempre la misma huella. */
  readonly hash: string;
}

/**
 * Un hecho que la auditoría registra: quién, qué, cuándo y desde dónde. Nunca lleva contraseñas,
 * cookies, tokens ni datos personales completos.
 */
export interface AuditEvent {
  /** Qué pasó. */
  readonly action: AuditAction;
  /** Si salió bien o fue rechazado. */
  readonly outcome: AuditOutcome;
  /** Cuándo pasó. */
  readonly occurredAt: Date;
  /** La persona que lo hizo, si se sabe: un inicio de sesión rechazado no la tiene. */
  readonly userId?: string;
  /** El celular con el que se intentó, enmascarado. */
  readonly phone?: MaskedValue;
  /** Por qué fue rechazado: el código del error (`INVALID_PHONE_NUMBER_OR_PASSWORD`). */
  readonly reason?: string;
  /** La petición que lo causó: junta este evento con su línea del log. */
  readonly requestId?: string;
  /** IP desde la que se pidió. */
  readonly ip?: string;
  /** Navegador o app desde la que se pidió. */
  readonly userAgent?: string;
  /** Datos propios del hecho, sin datos personales (por ejemplo, `mustChangePassword`). */
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}
