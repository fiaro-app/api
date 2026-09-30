import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import {
  getLenderScope,
  setLenderScope,
} from '@/shared/infrastructure/http/lender-scope-request.js';

const SCOPE: LenderScope = {
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles: ['OWNER', 'LENDER', 'COLLECTOR'],
};

describe('alcance de la petición', () => {
  it('no hay alcance hasta que el guard lo guarda', () => {
    expect(getLenderScope({} as Request)).toBeUndefined();
  });

  it('devuelve el alcance que se guardó', () => {
    const request = {} as Request;

    setLenderScope(request, SCOPE);

    expect(getLenderScope(request)).toBe(SCOPE);
  });

  it('la guarda bajo una clave simbólica: no aparece al listar ni serializar la petición', () => {
    const request = {} as Request;

    setLenderScope(request, SCOPE);

    expect(Object.keys(request)).toEqual([]);
    expect(JSON.stringify(request)).toBe('{}');
  });
});
