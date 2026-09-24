import type { Response } from 'express';

/**
 * Lo mínimo de `Response` de Express que usan las pruebas unitarias del controller y del escritor
 * de respuestas, guardando lo que reciben para poder inspeccionarlo.
 */
export class FakeExpressResponse {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  readonly cookies: string[] = [];
  varyValue: string | undefined;
  body: string | undefined;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  append(name: string, value: string) {
    if (name.toLowerCase() === 'set-cookie') {
      this.cookies.push(value);
    }
    return this;
  }

  vary(value: string) {
    this.varyValue = value;
    return this;
  }

  type(value: string) {
    this.headers.set('content-type', value);
    return this;
  }

  end(body: string) {
    this.body = body;
  }

  /** La respuesta con el tipo que espera el código que se prueba. */
  asResponse(): Response {
    return this as unknown as Response;
  }
}
