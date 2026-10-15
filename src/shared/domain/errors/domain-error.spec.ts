import { describe, expect, it } from 'vitest';
import {
  DomainError,
  type DomainErrorDetail,
} from '@/shared/domain/errors/domain-error.js';

class ProbeError extends DomainError {
  readonly code = 'PROBE_FAILED';
  readonly errorCode = 'P999U';
  readonly kind = 'INVALID';

  constructor(detail?: DomainErrorDetail) {
    super('falló la prueba', detail);
  }
}

describe('DomainError', () => {
  it('es un Error con su mensaje y toma su nombre de la clase que lo lanza', () => {
    const error = new ProbeError();

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('falló la prueba');
    expect(error.name).toBe('ProbeError');
    expect(error.stack).toBeDefined();
  });

  it('declara su código estable y su categoría', () => {
    expect(new ProbeError()).toMatchObject({
      code: 'PROBE_FAILED',
      kind: 'INVALID',
    });
  });

  it('sin detalle no lleva params ni issues', () => {
    const error = new ProbeError();

    expect(error.params).toBeUndefined();
    expect(error.issues).toBeUndefined();
  });

  it('lleva los params y los issues que se le pasan', () => {
    const detail: DomainErrorDetail = {
      params: { minLength: 8 },
      issues: [{ path: ['password'], message: 'validation.custom' }],
    };

    const error = new ProbeError(detail);

    expect(error.params).toEqual({ minLength: 8 });
    expect(error.issues).toEqual(detail.issues);
  });
});
