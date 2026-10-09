import { describe, expect, it } from 'vitest';
import { validateLeadData } from '@/modules/leads/application/services/lead-data.validator.js';
import { InvalidLeadDataError } from '@/modules/leads/domain/errors/invalid-lead-data.error.js';

const VALID = {
  name: 'Ana Pérez',
  phone: '300 123 4567',
  message: 'Quiero probar Fiaro con mis cobradores.',
};

function issuesOf(input: Parameters<typeof validateLeadData>[0]) {
  try {
    validateLeadData(input);
  } catch (error) {
    if (error instanceof InvalidLeadDataError) {
      return error.issues.map((issue) => issue.path.join('.'));
    }
    throw error;
  }
  return [];
}

describe('validateLeadData', () => {
  it('normaliza el celular a E.164 y recorta el nombre y el mensaje', () => {
    expect(
      validateLeadData({
        ...VALID,
        name: '  Ana Pérez ',
        message: '  Hola, quiero info  ',
      }),
    ).toEqual({
      name: 'Ana Pérez',
      phone: '+573001234567',
      email: null,
      message: 'Hola, quiero info',
    });
  });

  it('acepta solo un correo, en minúsculas', () => {
    expect(
      validateLeadData({
        name: 'Ana',
        email: ' Ana@Ejemplo.CO ',
        message: 'Hola, quiero info',
      }),
    ).toMatchObject({ phone: null, email: 'ana@ejemplo.co' });
  });

  it('acepta los dos medios de contacto a la vez', () => {
    expect(
      validateLeadData({ ...VALID, email: 'ana@ejemplo.co' }),
    ).toMatchObject({ phone: '+573001234567', email: 'ana@ejemplo.co' });
  });

  it('exige al menos un celular o un correo', () => {
    expect(issuesOf({ name: 'Ana', message: 'Hola, quiero info' })).toEqual([
      'phone',
    ]);
    expect(
      issuesOf({
        name: 'Ana',
        phone: '   ',
        email: '',
        message: 'Hola, quiero info',
      }),
    ).toEqual(['phone']);
  });

  it('rechaza un celular que no es colombiano, aunque traiga un correo válido', () => {
    expect(
      issuesOf({ ...VALID, phone: '12345', email: 'ana@ejemplo.co' }),
    ).toEqual(['phone']);
  });

  it('rechaza un correo mal formado, aunque traiga un celular válido', () => {
    expect(issuesOf({ ...VALID, email: 'no-es-un-correo' })).toEqual(['email']);
  });

  it.each([
    ['un nombre demasiado corto', { ...VALID, name: 'A' }, 'name'],
    ['un nombre demasiado largo', { ...VALID, name: 'A'.repeat(101) }, 'name'],
    ['un mensaje demasiado corto', { ...VALID, message: 'Hi' }, 'message'],
    [
      'un mensaje demasiado largo',
      { ...VALID, message: 'x'.repeat(1001) },
      'message',
    ],
  ])('rechaza %s', (_name, input, field) => {
    expect(issuesOf(input)).toEqual([field]);
  });

  it('reporta todos los campos inválidos a la vez', () => {
    expect(issuesOf({ name: '', message: '', phone: 'x' })).toEqual([
      'name',
      'message',
      'phone',
    ]);
  });
});
