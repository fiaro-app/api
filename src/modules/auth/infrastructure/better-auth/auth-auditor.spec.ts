import { describe, expect, it } from 'vitest';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';
import { runWithRequestContext } from '@/shared/infrastructure/logging/request-context.js';
import { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';

const NOW = new Date('2026-09-25T10:00:00.000Z');
const PHONE = '+573001234567';
const origin = { ip: '203.0.113.7', userAgent: 'Fiaro/1.0' };

function setup() {
  const events: AuditEvent[] = [];
  const log: AuditLog = { record: (event) => events.push(event) };
  const masker = new PersonalDataMasker('un-secreto-de-prueba');
  return { events, masker, auditor: new AuthAuditor(log, masker, () => NOW) };
}

describe('AuthAuditor', () => {
  it('un inicio de sesión guarda quién, el celular enmascarado, la contraseña temporal y desde dónde', () => {
    const { auditor, events, masker } = setup();

    auditor.signedIn({ id: 'u1', phone: PHONE }, true, origin);

    expect(events).toEqual([
      {
        action: 'auth.sign_in.succeeded',
        outcome: 'SUCCESS',
        details: { mustChangePassword: true },
        occurredAt: NOW,
        userId: 'u1',
        phone: masker.mask(PHONE),
        requestId: undefined,
        ip: origin.ip,
        userAgent: origin.userAgent,
      },
    ]);
  });

  it('un inicio de sesión rechazado guarda el celular enmascarado y el motivo, sin persona', () => {
    const { auditor, events, masker } = setup();

    auditor.signInFailed(PHONE, 'INVALID_PHONE_NUMBER_OR_PASSWORD', origin);

    expect(events[0]).toMatchObject({
      action: 'auth.sign_in.failed',
      outcome: 'FAILURE',
      reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
      phone: masker.mask(PHONE),
    });
    expect(events[0]?.userId).toBeUndefined();
  });

  it('un inicio de sesión rechazado sin celular no lleva celular', () => {
    const { auditor, events } = setup();

    auditor.signInFailed(undefined, 'VALIDATION_ERROR', {});

    expect(events[0]?.phone).toBeUndefined();
    expect(events[0]?.ip).toBeUndefined();
  });

  it('un inicio de sesión bloqueado guarda el celular enmascarado, el motivo y cuánto falta para reintentar', () => {
    const { auditor, events, masker } = setup();

    auditor.signInLocked(PHONE, 612, origin);

    expect(events[0]).toMatchObject({
      action: 'auth.sign_in.locked',
      outcome: 'FAILURE',
      reason: 'SIGN_IN_LOCKED',
      phone: masker.mask(PHONE),
      details: { retryAfterSeconds: 612 },
      ip: origin.ip,
    });
    expect(events[0]?.userId).toBeUndefined();
    expect(JSON.stringify(events)).not.toContain('3001234567');
  });

  it('cerrar sesión guarda quién', () => {
    const { auditor, events } = setup();

    auditor.signedOut('u1', origin);

    expect(events[0]).toMatchObject({
      action: 'auth.sign_out',
      outcome: 'SUCCESS',
      userId: 'u1',
    });
  });

  it.each(['others', 'all'] as const)(
    'cerrar una sesión desde otra (%s) guarda de quién era y el alcance, sin celular',
    (scope) => {
      const { auditor, events } = setup();

      auditor.sessionRevoked('u1', scope, origin);

      expect(events[0]).toMatchObject({
        action: 'auth.session.revoked',
        outcome: 'SUCCESS',
        userId: 'u1',
        details: { scope },
        ip: origin.ip,
      });
      expect(events[0]?.phone).toBeUndefined();
    },
  );

  it('cambiar la contraseña guarda quién', () => {
    const { auditor, events } = setup();

    auditor.passwordChanged({ id: 'u1', phone: PHONE }, origin);

    expect(events[0]).toMatchObject({
      action: 'auth.password.changed',
      outcome: 'SUCCESS',
      userId: 'u1',
    });
  });

  it('un cambio de contraseña rechazado guarda quién lo intentó y el motivo', () => {
    const { auditor, events } = setup();

    auditor.passwordChangeFailed(
      { id: 'u1', phone: PHONE },
      'INVALID_PASSWORD',
      origin,
    );

    expect(events[0]).toMatchObject({
      action: 'auth.password.change_failed',
      outcome: 'FAILURE',
      reason: 'INVALID_PASSWORD',
      userId: 'u1',
    });
  });

  it('un cambio de contraseña rechazado sin persona no lleva persona', () => {
    const { auditor, events } = setup();

    auditor.passwordChangeFailed(undefined, 'UNAUTHORIZED', origin);

    expect(events[0]?.userId).toBeUndefined();
    expect(events[0]?.phone).toBeUndefined();
  });

  it('pedir recuperar la contraseña guarda el celular enmascarado y si se mandó el código', () => {
    const { auditor, events, masker } = setup();

    auditor.passwordResetRequested(PHONE, true, origin);

    expect(events[0]).toMatchObject({
      action: 'auth.password.reset_requested',
      outcome: 'SUCCESS',
      details: { sent: true },
      phone: masker.mask(PHONE),
    });
    expect(events[0]?.userId).toBeUndefined();
  });

  it('restablecer la contraseña guarda quién', () => {
    const { auditor, events } = setup();

    auditor.passwordResetCompleted({ id: 'u1', phone: PHONE }, origin);

    expect(events[0]).toMatchObject({
      action: 'auth.password.reset_completed',
      outcome: 'SUCCESS',
      userId: 'u1',
    });
  });

  it('pedir verificar el correo de contacto guarda quién', () => {
    const { auditor, events } = setup();

    auditor.contactEmailVerificationRequested('u1', origin);

    expect(events[0]).toMatchObject({
      action: 'auth.email.verification_requested',
      outcome: 'SUCCESS',
      userId: 'u1',
    });
  });

  it('verificar el correo de contacto guarda quién', () => {
    const { auditor, events } = setup();

    auditor.contactEmailVerified('u1', origin);

    expect(events[0]).toMatchObject({
      action: 'auth.email.verified',
      outcome: 'SUCCESS',
      userId: 'u1',
    });
  });

  it('actualizar el perfil guarda quién y qué campos cambiaron, nunca los valores', () => {
    const { auditor, events } = setup();

    auditor.profileUpdated(
      'u1',
      { fullName: true, contactEmail: false },
      origin,
    );

    expect(events[0]).toMatchObject({
      action: 'auth.profile.updated',
      outcome: 'SUCCESS',
      userId: 'u1',
      details: { fullNameChanged: true, contactEmailChanged: false },
    });
  });

  it('desactivar la cuenta guarda quién', () => {
    const { auditor, events } = setup();

    auditor.accountDeactivated('u1', origin);

    expect(events[0]).toMatchObject({
      action: 'auth.account.deactivated',
      outcome: 'SUCCESS',
      userId: 'u1',
    });
  });

  it('agrega el id de la petición en curso, para unir el evento con su línea del log', () => {
    const { auditor, events } = setup();

    runWithRequestContext({ requestId: 'req-42' }, () => {
      auditor.signedOut('u1', origin);
    });

    expect(events[0]?.requestId).toBe('req-42');
  });

  it('ningún evento lleva el celular completo', () => {
    const { auditor, events } = setup();

    auditor.signedIn({ id: 'u1', phone: PHONE }, false, origin);
    auditor.signInFailed(PHONE, 'INVALID_PHONE_NUMBER_OR_PASSWORD', origin);
    auditor.passwordChanged({ id: 'u1', phone: PHONE }, origin);

    expect(JSON.stringify(events)).not.toContain(PHONE);
    expect(JSON.stringify(events)).not.toContain('3001234567');
  });

  it('usa la hora actual cuando no se le da un reloj', () => {
    const events: AuditEvent[] = [];
    const auditor = new AuthAuditor(
      { record: (event) => events.push(event) },
      new PersonalDataMasker('un-secreto-de-prueba'),
    );
    const before = Date.now();

    auditor.signedOut('u1', origin);

    expect(events[0]?.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
