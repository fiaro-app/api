import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  REQUEST_ID_HEADER,
  requestIdFor,
} from '@/shared/infrastructure/logging/request-id.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function attend(sent?: string | string[]) {
  const setHeader = vi.fn();
  const req = { headers: { 'x-request-id': sent } } as unknown as Request;
  const res = { setHeader } as unknown as Response;
  return { id: requestIdFor(req, res), setHeader };
}

describe('requestIdFor', () => {
  it.each([
    ['un identificador corto del cliente', 'prueba-1234567890'],
    ['un UUID', '3f2b7c9e-1a4d-4e5f-8a6b-7c8d9e0f1a2b'],
    ['letras, números, punto, guion y guion bajo', 'Abc_123.def-456'],
  ])('respeta %s', (_caso, sent) => {
    expect(attend(sent).id).toBe(sent);
  });

  it.each([
    ['uno demasiado corto', 'abc'],
    ['uno demasiado largo', 'a'.repeat(65)],
    ['uno con espacios', 'un id con espacios'],
    ['uno con un salto de línea', 'abcdefgh\nINYECTADO'],
    ['uno con símbolos', 'abc<script>1234'],
    ['una cabecera repetida', ['abcdefgh1', 'abcdefgh2']],
  ])('reemplaza %s por un UUID nuevo', (_caso, sent) => {
    expect(attend(sent).id).toMatch(UUID);
  });

  it('crea un UUID cuando el cliente no envía nada', () => {
    expect(attend(undefined).id).toMatch(UUID);
  });

  it('cada petición sin identificador recibe uno distinto', () => {
    expect(attend().id).not.toBe(attend().id);
  });

  it('devuelve el identificador en la cabecera de la respuesta', () => {
    const { id, setHeader } = attend('prueba-1234567890');

    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
  });
});
