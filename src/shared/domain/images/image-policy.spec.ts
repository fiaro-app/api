import { describe, expect, it } from 'vitest';
import {
  detectImageType,
  imageTypeOfKey,
} from '@/shared/domain/images/image-policy.js';

const ID = '019dc2d6-0000-7000-8000-000000000001';

describe('detectImageType', () => {
  it('reconoce PNG y JPEG por sus primeros bytes', () => {
    expect(
      detectImageType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe('image/png');
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      'image/jpeg',
    );
  });

  it('rechaza lo demás (un SVG, un HTML, un archivo vacío)', () => {
    expect(detectImageType(new TextEncoder().encode('<svg'))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe('imageTypeOfKey', () => {
  it('acepta solo <prefijo>/<uuid>.<png|jpg>', () => {
    expect(
      imageTypeOfKey(`client-photos/a/b/${ID}.png`, 'client-photos/a/b'),
    ).toBe('image/png');
    expect(
      imageTypeOfKey(`client-photos/a/b/${ID}.jpg`, 'client-photos/a/b'),
    ).toBe('image/jpeg');
  });

  it('rechaza otra carpeta, otro dueño, otra extensión y subcarpetas', () => {
    expect(
      imageTypeOfKey(`client-photos/a/c/${ID}.png`, 'client-photos/a/b'),
    ).toBeNull();
    expect(
      imageTypeOfKey(`logos/a/b/${ID}.png`, 'client-photos/a/b'),
    ).toBeNull();
    expect(
      imageTypeOfKey(`client-photos/a/b/${ID}.svg`, 'client-photos/a/b'),
    ).toBeNull();
    expect(
      imageTypeOfKey(`client-photos/a/b/x/${ID}.png`, 'client-photos/a/b'),
    ).toBeNull();
    expect(
      imageTypeOfKey(`client-photos/a/b/../${ID}.png`, 'client-photos/a/b'),
    ).toBeNull();
  });
});
