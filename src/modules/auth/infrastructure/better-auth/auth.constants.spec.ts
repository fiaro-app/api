import { describe, expect, it } from 'vitest';
import {
  AUTH_BASE_PATH,
  CHANGE_PASSWORD_PATH,
  CLIENT_IP_HEADER,
  GET_SESSION_PATH,
  SIGN_IN_PATH,
  SIGN_OUT_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';

describe('constantes de better-auth', () => {
  it('las rutas son las que expone la librería para el celular y la contraseña', () => {
    expect([
      SIGN_IN_PATH,
      GET_SESSION_PATH,
      SIGN_OUT_PATH,
      CHANGE_PASSWORD_PATH,
    ]).toEqual([
      '/sign-in/phone-number',
      '/get-session',
      '/sign-out',
      '/change-password',
    ]);
  });

  it('las rutas cuelgan de /auth', () => {
    expect(AUTH_BASE_PATH).toBe('/auth');
  });

  it('la IP del cliente viaja en una cabecera propia que la librería no conoce', () => {
    expect(CLIENT_IP_HEADER).toBe('x-fiaro-client-ip');
  });
});
