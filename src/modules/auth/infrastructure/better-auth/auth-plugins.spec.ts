import { describe, expect, it } from 'vitest';
import {
  authPlugins,
  DISABLED_PATHS,
} from '@/modules/auth/infrastructure/better-auth/auth-plugins.js';

describe('authPlugins', () => {
  const [phone, expo] = authPlugins();
  const { options } = phone;

  it('trae el inicio de sesión con celular y el plugin de Expo', () => {
    expect([phone.id, expo.id]).toEqual(['phone-number', 'expo']);
  });

  describe('el validador del celular', () => {
    const isValid = (value: string) => options?.phoneNumberValidator?.(value);

    it('acepta un celular colombiano en formato E.164', () => {
      expect(isValid('+573001234567')).toBe(true);
    });

    it.each([
      ['sin el indicativo', '3001234567'],
      ['de otro país', '+12025550123'],
      ['un fijo', '+576012345678'],
      ['con espacios', '+57 300 123 4567'],
      ['vacío', ''],
    ])('rechaza un celular %s', (_caso, value) => {
      expect(isValid(value)).toBe(false);
    });
  });

  it('no envía códigos por SMS: si alguna ruta lo pidiera, falla en lugar de callar', () => {
    expect(() =>
      options?.sendOTP({ phoneNumber: '+573001234567', code: '123456' }),
    ).toThrow('La verificación del celular por código no está habilitada.');
  });
});

describe('DISABLED_PATHS', () => {
  it('apaga las cuatro rutas de código por SMS del plugin de celular', () => {
    expect([...DISABLED_PATHS].sort()).toEqual([
      '/phone-number/request-password-reset',
      '/phone-number/reset-password',
      '/phone-number/send-otp',
      '/phone-number/verify',
    ]);
  });
});
