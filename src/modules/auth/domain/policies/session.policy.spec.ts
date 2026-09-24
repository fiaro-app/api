import { describe, expect, it } from 'vitest';
import {
  SESSION_LIFETIME_SECONDS,
  SESSION_REFRESH_INTERVAL_SECONDS,
} from '@/modules/auth/domain/policies/session.policy.js';

describe('política de sesión', () => {
  it('la sesión dura 30 días sin actividad', () => {
    expect(SESSION_LIFETIME_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it('se renueva como máximo una vez al día', () => {
    expect(SESSION_REFRESH_INTERVAL_SECONDS).toBe(24 * 60 * 60);
  });
});
