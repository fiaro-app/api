import { describe, expect, it } from 'vitest';
import { markLocalized } from '@/shared/infrastructure/i18n/localized-response.js';
import { FakeExpressResponse } from '@test/support/fake-express-response.js';

describe('markLocalized', () => {
  it('dice el idioma del texto y que la respuesta cambia según Accept-Language', () => {
    const res = new FakeExpressResponse();

    markLocalized(res.asResponse(), 'es');

    expect(res.headers.get('content-language')).toBe('es');
    expect(res.varyValue).toBe('Accept-Language');
  });
});
