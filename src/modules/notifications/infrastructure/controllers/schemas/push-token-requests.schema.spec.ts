import { describe, expect, it } from 'vitest';
import { PushTokenRequestSchema } from '@/modules/notifications/infrastructure/controllers/schemas/push-token-requests.schema.js';

const isValid = (token: string): boolean =>
  PushTokenRequestSchema.safeParse({ token }).success;

describe('PushTokenRequestSchema', () => {
  it('acepta un token con la forma de Expo', () => {
    expect(isValid('ExponentPushToken[nE2KIXD3XrDFqz4rZqbyyd]')).toBe(true);
    expect(isValid('ExponentPushToken[dispositivo-1_prueba]')).toBe(true);
  });

  it('rechaza lo que no tiene esa forma', () => {
    for (const token of [
      '',
      'abc',
      'ExponentPushToken[]',
      'ExponentPushToken[con espacios]',
      'ExpoPushToken[otra-forma]',
      'ExponentPushToken[dispositivo-1]extra',
    ]) {
      expect(isValid(token)).toBe(false);
    }
  });

  it('rechaza un token demasiado largo', () => {
    expect(isValid(`ExponentPushToken[${'a'.repeat(129)}]`)).toBe(false);
    expect(isValid(`ExponentPushToken[${'a'.repeat(128)}]`)).toBe(true);
  });
});
