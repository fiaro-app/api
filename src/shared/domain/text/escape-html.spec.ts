import { describe, expect, it } from 'vitest';
import { escapeHtml } from '@/shared/domain/text/escape-html.js';

describe('escapeHtml', () => {
  it('convierte los cinco caracteres que cambian el significado dentro de HTML', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });

  it('no escapa dos veces el ampersand que agrega el propio escape', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('deja intacto el texto sin caracteres especiales, con acentos incluidos', () => {
    expect(escapeHtml('María Gómez, cobradora 1')).toBe(
      'María Gómez, cobradora 1',
    );
  });
});
