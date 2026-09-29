import { describe, expect, it } from 'vitest';
import { AUDIT_ACTIONS } from '@/shared/domain/audit/audit-event.js';

describe('AUDIT_ACTIONS', () => {
  it('cada acción se llama <módulo>.<recurso>[.<hecho>], en minúsculas y con guion bajo', () => {
    for (const action of AUDIT_ACTIONS) {
      expect(action, action).toMatch(/^[a-z]+(\.[a-z]+(_[a-z]+)*){1,2}$/);
    }
  });

  it('no repite ninguna', () => {
    expect(new Set(AUDIT_ACTIONS).size).toBe(AUDIT_ACTIONS.length);
  });

  it('incluye los once hechos de la autenticación', () => {
    expect(AUDIT_ACTIONS).toEqual([
      'auth.sign_in.succeeded',
      'auth.sign_in.failed',
      'auth.sign_in.locked',
      'auth.sign_out',
      'auth.session.revoked',
      'auth.password.changed',
      'auth.password.change_failed',
      'auth.password.reset_requested',
      'auth.password.reset_completed',
      'auth.email.verification_requested',
      'auth.email.verified',
    ]);
  });
});
