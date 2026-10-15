import { describe, expect, it } from 'vitest';
import {
  detectLogoType,
  logoTypeOfKey,
} from '@/modules/lenders/domain/logo-policy.js';

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const SVG = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">',
);
const HTML = new TextEncoder().encode(
  '<!doctype html><script>alert(1)</script>',
);
const EXE = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]);

describe('detectLogoType', () => {
  it('reconoce PNG y JPEG por su firma', () => {
    expect(detectLogoType(PNG)).toBe('image/png');
    expect(detectLogoType(JPEG)).toBe('image/jpeg');
  });

  it('rechaza SVG, HTML, ejecutables y archivos vacíos o cortos, aunque digan ser una imagen', () => {
    for (const bytes of [
      SVG,
      HTML,
      EXE,
      new Uint8Array(),
      Uint8Array.from([0x89, 0x50]),
    ]) {
      expect(detectLogoType(bytes)).toBeNull();
    }
  });
});

const LENDER = '0198f8e0-0000-7000-8000-000000000001';
const FILE = '0198f8e0-0000-7000-8000-0000000000aa';

describe('logoTypeOfKey', () => {
  it('acepta la llave que genera la API para ese prestamista', () => {
    expect(logoTypeOfKey(LENDER, `logos/${LENDER}/${FILE}.png`)).toBe(
      'image/png',
    );
    expect(logoTypeOfKey(LENDER, `logos/${LENDER}/${FILE}.jpg`)).toBe(
      'image/jpeg',
    );
  });

  it('rechaza otro prestamista, otra carpeta, otra extensión y recorridos de ruta', () => {
    const other = '0198f8e0-0000-7000-8000-000000000002';
    for (const key of [
      `logos/${other}/${FILE}.png`,
      `otra/${LENDER}/${FILE}.png`,
      `logos/${LENDER}/${FILE}.svg`,
      `logos/${LENDER}/${FILE}.png.html`,
      `logos/${LENDER}/../${other}/${FILE}.png`,
      `logos/${LENDER}/nombre-libre.png`,
      `logos/${LENDER}/${FILE}.PNG`,
    ]) {
      expect(logoTypeOfKey(LENDER, key)).toBeNull();
    }
  });
});
