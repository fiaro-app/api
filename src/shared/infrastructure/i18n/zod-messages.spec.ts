import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FLAT_CATALOGS } from '@/shared/infrastructure/i18n/message-catalog.js';
import { configureZodMessages } from '@/shared/infrastructure/i18n/zod-messages.js';

/** La primera falla de un schema con ese dato: su mensaje. */
function firstIssue(schema: z.ZodType, input: unknown) {
  const issue = schema.safeParse(input).error?.issues[0];
  if (issue === undefined) {
    throw new Error('Se esperaba que el schema rechazara el dato.');
  }
  return { message: issue.message };
}

describe('mensajes de Zod', () => {
  beforeAll(() => {
    configureZodMessages();
  });

  afterAll(() => {
    z.config(z.locales.en());
  });

  describe('cada falla por defecto queda como la clave que le corresponde', () => {
    const Named = z.object({ name: z.string() });
    const Positive = z.number().positive();
    const cases: [string, z.ZodType, unknown, string][] = [
      ['dato que falta', Named, {}, 'validation.invalid_type.missing'],
      ['texto esperado', z.string(), 1, 'validation.invalid_type.string'],
      ['número esperado', z.number(), 'a', 'validation.invalid_type.number'],
      ['entero esperado', z.int(), 1.5, 'validation.invalid_type.int'],
      [
        'booleano esperado',
        z.boolean(),
        'a',
        'validation.invalid_type.boolean',
      ],
      [
        'lista esperada',
        z.array(z.string()),
        'a',
        'validation.invalid_type.array',
      ],
      ['objeto esperado', Named, 'a', 'validation.invalid_type.object'],
      ['otro tipo esperado', z.date(), 'a', 'validation.invalid_type.other'],
      [
        'texto muy corto',
        z.string().min(3),
        'a',
        'validation.too_small.string',
      ],
      [
        'número muy pequeño',
        z.number().min(3),
        1,
        'validation.too_small.number',
      ],
      [
        'número no positivo',
        Positive,
        0,
        'validation.too_small.number_exclusive',
      ],
      [
        'lista muy corta',
        z.array(z.string()).min(2),
        [],
        'validation.too_small.array',
      ],
      [
        'fecha muy temprana',
        z.date().min(new Date('2026-01-01')),
        new Date('2020-01-01'),
        'validation.too_small.other',
      ],
      [
        'texto muy largo',
        z.string().max(2),
        'abc',
        'validation.too_big.string',
      ],
      ['número muy grande', z.number().max(3), 9, 'validation.too_big.number'],
      [
        'número no negativo',
        z.number().negative(),
        0,
        'validation.too_big.number_exclusive',
      ],
      [
        'lista muy larga',
        z.array(z.string()).max(1),
        ['a', 'b'],
        'validation.too_big.array',
      ],
      [
        'fecha muy tardía',
        z.date().max(new Date('2020-01-01')),
        new Date('2026-01-01'),
        'validation.too_big.other',
      ],
      [
        'expresión regular',
        z.string().regex(/^a$/),
        'b',
        'validation.invalid_format.regex',
      ],
      ['correo', z.email(), 'a', 'validation.invalid_format.email'],
      ['uuid', z.uuid(), 'a', 'validation.invalid_format.uuid'],
      ['dirección web', z.url(), 'a', 'validation.invalid_format.url'],
      ['fecha', z.iso.date(), 'a', 'validation.invalid_format.date'],
      [
        'fecha y hora',
        z.iso.datetime(),
        'a',
        'validation.invalid_format.datetime',
      ],
      ['otro formato', z.ipv4(), 'a', 'validation.invalid_format.other'],
      [
        'valor no permitido',
        z.enum(['A', 'B']),
        'C',
        'validation.invalid_value',
      ],
      [
        'campo desconocido',
        z.strictObject({ a: z.string() }),
        { a: 'x', b: 1 },
        'validation.unrecognized_keys',
      ],
      [
        'no es múltiplo',
        z.number().multipleOf(5),
        3,
        'validation.not_multiple_of',
      ],
      [
        'ninguna opción de la unión',
        z.union([z.string(), z.number()]),
        true,
        'validation.invalid_union',
      ],
      [
        'regla propia sin mensaje',
        z.string().refine(() => false),
        'a',
        'validation.custom',
      ],
      [
        'llave de un mapa',
        z.record(z.string().min(3), z.number()),
        { a: 1 },
        'validation.invalid',
      ],
    ];

    it.each(cases)('%s', (_name, schema, input, key) => {
      expect(firstIssue(schema, input).message).toBe(key);
    });

    it.each(cases)(
      'la clave de «%s» existe en el catálogo en español',
      (_name, schema, input) => {
        const { message } = firstIssue(schema, input);

        expect(FLAT_CATALOGS.es).toHaveProperty([message]);
      },
    );
  });

  it('un mensaje que el propio schema escribe tiene prioridad y sale tal cual', () => {
    const { message } = firstIssue(z.string().min(3, 'Muy corto'), 'a');

    expect(message).toBe('Muy corto');
  });
});
