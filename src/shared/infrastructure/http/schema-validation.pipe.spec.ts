import { BadRequestException, HttpException } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  SchemaValidationPipe,
  toValidationException,
} from './schema-validation.pipe.js';

const CreateLoanSchema = z.strictObject({
  clientId: z.string().min(1, 'obligatorio'),
  installments: z.int().min(1, 'al menos una cuota').default(30),
  notes: z
    .array(z.strictObject({ text: z.string().min(1, 'texto vacío') }))
    .default([]),
});

/** Ejecuta el pipe y devuelve el error que lanza, para inspeccionarlo. */
async function failure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba que el pipe rechazara el valor.');
}

describe('SchemaValidationPipe', () => {
  const pipe = new SchemaValidationPipe();

  it('devuelve el valor validado con los valores por defecto aplicados', async () => {
    const result = await pipe.transform(
      { clientId: 'c1' },
      { type: 'body', schema: CreateLoanSchema },
    );

    expect(result).toEqual({ clientId: 'c1', installments: 30, notes: [] });
  });

  it('rechaza con 400 VALIDATION_FAILED y el detalle por campo', async () => {
    const error = await failure(
      pipe.transform(
        { clientId: '' },
        { type: 'body', schema: CreateLoanSchema },
      ),
    );

    expect(error).toBeInstanceOf(BadRequestException);
    const exception = error as BadRequestException;
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Los datos enviados no son válidos.',
      issues: [{ path: ['clientId'], message: 'obligatorio' }],
    });
  });

  it('rechaza los campos que el schema no conoce', async () => {
    const error = (await failure(
      pipe.transform(
        { clientId: 'c1', role: 'admin' },
        { type: 'body', schema: CreateLoanSchema },
      ),
    )) as BadRequestException;

    const { issues } = error.getResponse() as {
      issues: { path: unknown[]; message: string }[];
    };
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toEqual([]);
    expect(issues[0]?.message).toContain('role');
  });

  it('indica la ruta completa de los errores anidados', async () => {
    const error = (await failure(
      pipe.transform(
        { clientId: 'c1', notes: [{ text: 'ok' }, { text: '' }] },
        { type: 'body', schema: CreateLoanSchema },
      ),
    )) as BadRequestException;

    const { issues } = error.getResponse() as {
      issues: { path: unknown[] }[];
    };
    expect(issues[0]?.path).toEqual(['notes', 1, 'text']);
  });

  it('solo expone la ruta y el mensaje de cada error', async () => {
    const error = (await failure(
      pipe.transform(
        { clientId: '', installments: 0 },
        { type: 'body', schema: CreateLoanSchema },
      ),
    )) as BadRequestException;

    const { issues } = error.getResponse() as { issues: object[] };
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      expect(Object.keys(issue).sort()).toEqual(['message', 'path']);
    }
  });

  it('valida también los parámetros de ruta que declaran schema', async () => {
    const schema = z.uuid();

    await expect(
      pipe.transform('no-es-un-uuid', { type: 'param', data: 'id', schema }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform('0192a0b4-3b5c-7d2e-8f00-123456789abc', {
        type: 'param',
        data: 'id',
        schema,
      }),
    ).resolves.toBe('0192a0b4-3b5c-7d2e-8f00-123456789abc');
  });

  it('deja pasar tal cual un parámetro de ruta sin schema', async () => {
    await expect(
      pipe.transform('abc', { type: 'param', data: 'id' }),
    ).resolves.toBe('abc');
  });

  it('ignora los parámetros de decoradores propios', async () => {
    const valor = { session: 'abc' };

    await expect(pipe.transform(valor, { type: 'custom' })).resolves.toBe(
      valor,
    );
  });

  describe('falla cerrado cuando falta el schema', () => {
    it.each([
      ['body', 'Body'],
      ['query', 'Query'],
    ] as const)('en un %s', async (type, decorator) => {
      const error = await failure(pipe.transform({ x: 1 }, { type }));

      expect(error).not.toBeInstanceOf(HttpException);
      expect((error as Error).message).toContain(`@${decorator}({ schema })`);
    });
  });
});

describe('toValidationException', () => {
  it('convierte los segmentos de la ruta a texto o número', () => {
    const issues: StandardSchemaV1.Issue[] = [
      {
        message: 'inválido',
        path: [{ key: 'items' }, 0, 'qty', Symbol('interno')],
      },
    ];

    const response = toValidationException(issues).getResponse();

    expect(response).toMatchObject({
      issues: [{ path: ['items', 0, 'qty', 'Symbol(interno)'] }],
    });
  });

  it('usa una ruta vacía cuando el error no indica campo', () => {
    const response = toValidationException([
      { message: 'inválido' },
    ]).getResponse();

    expect(response).toMatchObject({
      issues: [{ path: [], message: 'inválido' }],
    });
  });
});
