import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

/** Los valores de los marcadores de la primera falla de un schema con ese dato. */
function paramsOf(schema: z.ZodType, input: unknown) {
  const issue = schema.safeParse(input).error?.issues[0];
  if (issue === undefined) {
    throw new Error('Se esperaba que el schema rechazara el dato.');
  }
  return zodIssueParams(issue);
}

describe('zodIssueParams', () => {
  it('trae el mínimo de un texto', () => {
    expect(paramsOf(z.string().min(3), 'a')).toEqual({ minimum: '3' });
  });

  it('trae el máximo de un número', () => {
    expect(paramsOf(z.number().max(3), 9)).toEqual({ maximum: '3' });
  });

  it('trae el divisor', () => {
    expect(paramsOf(z.number().multipleOf(5), 3)).toEqual({ divisor: '5' });
  });

  it('junta los campos que sobran', () => {
    const schema = z.strictObject({ a: z.string() });

    expect(paramsOf(schema, { a: 'x', b: 1, c: 2 })).toEqual({ keys: 'b, c' });
  });

  it('junta los valores permitidos', () => {
    expect(paramsOf(z.enum(['A', 'B']), 'C')).toEqual({ values: 'A, B' });
    expect(paramsOf(z.literal([1, null]), 'C')).toEqual({ values: '1, null' });
  });

  it('muestra un bigint como texto', () => {
    expect(zodIssueParams({ minimum: 10n })).toEqual({ minimum: '10' });
  });

  it('queda vacío si la falla no trae ninguno de esos campos', () => {
    expect(paramsOf(z.string(), 1)).toEqual({});
  });
});

describe('toIssuePath', () => {
  it('conserva los textos y los números de la ruta', () => {
    expect(toIssuePath(['items', 0, 'name'])).toEqual(['items', 0, 'name']);
  });

  it('pasa los símbolos a texto: en JSON desaparecerían', () => {
    expect(toIssuePath(['data', Symbol('clave')])).toEqual([
      'data',
      'Symbol(clave)',
    ]);
  });

  it('una ruta vacía sigue vacía', () => {
    expect(toIssuePath([])).toEqual([]);
  });
});
