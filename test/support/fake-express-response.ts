import type { Response } from 'express';

/**
 * Lo mínimo de `Response` de Express que usan las pruebas unitarias del controller, del escritor
 * de respuestas y del filtro de excepciones, guardando lo que reciben para poder inspeccionarlo.
 */
export class FakeExpressResponse {
  statusCode = 200;
  headersSent = false;
  readonly headers = new Map<string, string>();
  readonly cookies: string[] = [];
  readonly varyValues: string[] = [];
  /** La petición de la que sale la respuesta (`res.req` en Express). */
  req: { originalUrl: string } = { originalUrl: '/probe' };
  body: string | undefined;
  /** Lo que se escribió con `json()`. */
  jsonBody: unknown;
  ended = false;
  /** Los datos de la respuesta (`res.locals` en Express): el filtro deja ahí lo que va al log. */
  readonly locals: Record<string, unknown> = {};

  /** Todo lo que se pidió en `Vary`, o `undefined` si nada. */
  get varyValue(): string | undefined {
    return this.varyValues.length > 0 ? this.varyValues.join(', ') : undefined;
  }

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
    this.varyValues.push(value);
    return this;
  }

  type(value: string) {
    this.headers.set('content-type', value);
    return this;
  }

  json(body: unknown) {
    this.jsonBody = body;
    this.ended = true;
    return this;
  }

  end(body?: string) {
    this.body = body;
    this.ended = true;
  }

  /** La respuesta con el tipo que espera el código que se prueba. */
  asResponse(): Response {
    return this as unknown as Response;
  }
}
