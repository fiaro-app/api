import { APIError } from 'better-auth/api';
import { describe, expect, it } from 'vitest';
import {
  failureCodeOf,
  newSessionOf,
  originOf,
  phoneOf,
  requesterOf,
} from '@/modules/auth/infrastructure/better-auth/auth-audit-rules.js';

const request = (headers: Record<string, string>) =>
  new Request('https://api.fiaro.co/auth/x', { headers });

describe('originOf', () => {
  it('toma la IP que escribió el controller y el navegador de la petición', () => {
    const ctx = {
      request: request({
        'x-fiaro-client-ip': '203.0.113.7',
        'user-agent': 'Fiaro/1.0',
        'x-forwarded-for': '198.51.100.9',
      }),
    };

    expect(originOf(ctx)).toEqual({
      ip: '203.0.113.7',
      userAgent: 'Fiaro/1.0',
    });
  });

  it('lo que falta queda sin definir', () => {
    expect(originOf({ request: request({}) })).toEqual({
      ip: undefined,
      userAgent: undefined,
    });
  });

  it.each([
    ['sin petición', {}],
    ['una petición que no es de la Web', { request: { headers: {} } }],
    ['un texto', { request: 'x' }],
  ])('%s no da datos de origen', (_caso, ctx) => {
    expect(originOf(ctx)).toEqual({});
  });
});

describe('phoneOf', () => {
  it('lee el celular del cuerpo', () => {
    expect(phoneOf({ body: { phoneNumber: '+573001234567' } })).toBe(
      '+573001234567',
    );
  });

  it.each([
    ['sin cuerpo', {}],
    ['un cuerpo que no es un objeto', { body: 'x' }],
    ['un cuerpo nulo', { body: null }],
    ['un celular que no es texto', { body: { phoneNumber: 3001234567 } }],
    ['un cuerpo sin celular', { body: { password: 'x' } }],
  ])('%s no da celular', (_caso, ctx) => {
    expect(phoneOf(ctx)).toBeUndefined();
  });
});

describe('failureCodeOf', () => {
  const returned = (value: unknown) => ({ context: { returned: value } });

  it('da el código con que la ruta rechazó la petición', () => {
    const error = new APIError('UNAUTHORIZED', {
      code: 'INVALID_PASSWORD',
      message: 'x',
    });

    expect(failureCodeOf(returned(error))).toBe('INVALID_PASSWORD');
  });

  it('si el error no trae código da su estado', () => {
    expect(
      failureCodeOf(returned(new APIError('FORBIDDEN', { message: 'x' }))),
    ).toMatch(/^(403|FORBIDDEN)$/);
  });

  it.each([
    ['una respuesta correcta', returned({ user: {} })],
    ['sin respuesta', returned(undefined)],
    ['sin contexto', {}],
    ['un error que no es de better-auth', returned(new Error('x'))],
  ])('%s no es un rechazo', (_caso, ctx) => {
    expect(failureCodeOf(ctx)).toBeUndefined();
  });
});

describe('newSessionOf', () => {
  it('da la persona de la sesión nueva y si trae contraseña temporal', () => {
    const ctx = {
      context: {
        newSession: {
          user: {
            id: 'u1',
            phoneNumber: '+573001234567',
            mustChangePassword: true,
          },
        },
      },
    };

    expect(newSessionOf(ctx)).toEqual({
      person: { id: 'u1', phone: '+573001234567' },
      mustChangePassword: true,
    });
  });

  it('sin la marca, la contraseña no es temporal', () => {
    const ctx = { context: { newSession: { user: { id: 'u1' } } } };

    expect(newSessionOf(ctx)).toEqual({
      person: { id: 'u1', phone: undefined },
      mustChangePassword: false,
    });
  });

  it.each([
    ['sin contexto', {}],
    ['sin sesión nueva', { context: {} }],
    ['una sesión nula', { context: { newSession: null } }],
    ['una sesión sin persona', { context: { newSession: {} } }],
    ['una persona sin id', { context: { newSession: { user: {} } } }],
  ])('%s no da persona', (_caso, ctx) => {
    expect(newSessionOf(ctx)).toBeUndefined();
  });
});

describe('requesterOf', () => {
  it('da la persona de la sesión de la cookie', () => {
    const ctx = {
      context: {
        session: { user: { id: 'u1', phoneNumber: '+573001234567' } },
      },
    };

    expect(requesterOf(ctx)).toEqual({ id: 'u1', phone: '+573001234567' });
  });

  it.each([
    ['sin contexto', {}],
    ['sin sesión', { context: { session: null } }],
    ['una sesión sin persona', { context: { session: {} } }],
  ])('%s no da persona', (_caso, ctx) => {
    expect(requesterOf(ctx)).toBeUndefined();
  });
});
