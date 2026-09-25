import { describe, expect, it } from 'vitest';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';

const PHONE = '+573001234567';

describe('PersonalDataMasker', () => {
  const masker = new PersonalDataMasker('un-secreto-de-prueba');

  it('deja los últimos 4 caracteres y una huella de 32 caracteres hexadecimales', () => {
    const masked = masker.mask(PHONE);

    expect(masked.last4).toBe('4567');
    expect(masked.hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('el mismo dato da siempre la misma huella: así se sigue a la misma persona', () => {
    expect(masker.mask(PHONE)).toEqual(masker.mask(PHONE));
  });

  it('datos distintos dan huellas distintas, aunque terminen igual', () => {
    const other = masker.mask('+573109994567');

    expect(other.last4).toBe('4567');
    expect(other.hash).not.toBe(masker.mask(PHONE).hash);
  });

  it('con otro secreto la misma huella no se puede recalcular', () => {
    const elsewhere = new PersonalDataMasker('otro-secreto-distinto');

    expect(elsewhere.mask(PHONE).hash).not.toBe(masker.mask(PHONE).hash);
  });

  it('no deja rastro del dato completo', () => {
    const masked = masker.mask(PHONE);

    expect(JSON.stringify(masked)).not.toContain(PHONE);
    expect(JSON.stringify(masked)).not.toContain('300123');
  });

  it('un dato de menos de 4 caracteres queda entero en last4, pero con su huella', () => {
    expect(masker.mask('abc').last4).toBe('abc');
    expect(masker.mask('').last4).toBe('');
    expect(masker.mask('abc').hash).toMatch(/^[0-9a-f]{32}$/);
  });
});
