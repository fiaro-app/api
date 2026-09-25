import { MobilePhoneSchema } from '@fiaro-app/contracts';
import { describe, expect, it } from 'vitest';
import { InvalidMobilePhoneError } from '@/shared/domain/errors/invalid-mobile-phone.error.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const VALID = ['+573001234567', '+573109998877', '+573509998877'];

const INVALID = [
  '',
  '3001234567',
  '573001234567',
  '+57 300 123 4567',
  '+573001234',
  '+57300123456789',
  '+576012345678',
  '+12025550123',
  '+573001234567 ',
  '+57300123456a',
];

describe('MobilePhone', () => {
  it.each(VALID)('acepta %s', (value) => {
    expect(MobilePhone.parse(value).value).toBe(value);
  });

  it.each(INVALID)('rechaza %j con InvalidMobilePhoneError', (value) => {
    expect(() => MobilePhone.parse(value)).toThrow(InvalidMobilePhoneError);
  });

  it('el error lleva un código estable y su nombre de clase', () => {
    let error: unknown;
    try {
      MobilePhone.parse('123');
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      code: 'INVALID_PHONE',
      kind: 'INVALID',
      name: 'InvalidMobilePhoneError',
    });
  });

  it('coincide con el celular que define el contrato compartido', () => {
    for (const value of [...VALID, ...INVALID]) {
      const acceptedByDomain = (() => {
        try {
          MobilePhone.parse(value);
          return true;
        } catch {
          return false;
        }
      })();

      expect(acceptedByDomain, value).toBe(
        MobilePhoneSchema.safeParse(value).success,
      );
    }
  });
});
