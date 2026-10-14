import { describe, expect, it } from 'vitest';
import { validateTenantData } from '@/modules/tenants/application/services/tenant-data.validator.js';
import { InvalidTenantDataError } from '@/modules/tenants/domain/errors/invalid-tenant-data.error.js';

describe('validateTenantData', () => {
  it('devuelve el nombre recortado', () => {
    expect(validateTenantData({ name: '  Préstamos Ana  ' })).toEqual({
      name: 'Préstamos Ana',
    });
  });

  it('rechaza un nombre demasiado corto', () => {
    let error: unknown;
    try {
      validateTenantData({ name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidTenantDataError);
    expect((error as InvalidTenantDataError).issues[0]?.path).toEqual(['name']);
  });

  it('cada issue lleva los valores de su falla para llenar los marcadores del mensaje', () => {
    let error: unknown;
    try {
      validateTenantData({ name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect((error as InvalidTenantDataError).issues[0]?.params).toEqual({
      minimum: '2',
    });
  });
});
