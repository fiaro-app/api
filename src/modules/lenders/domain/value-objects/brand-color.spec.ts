import { describe, expect, it } from 'vitest';
import {
  isBrandColor,
  normalizeBrandColor,
} from '@/modules/lenders/domain/value-objects/brand-color.js';

describe('isBrandColor', () => {
  it.each(['#FF8800', '#ff8800', '#000000', '#aBc123'])(
    'acepta %s',
    (value) => {
      expect(isBrandColor(value)).toBe(true);
    },
  );

  it.each([
    ['sin almohadilla', 'FF8800'],
    ['de tres dígitos', '#F80'],
    ['de ocho dígitos (con alfa)', '#FF8800AA'],
    ['con un dígito que no es hexadecimal', '#GG8800'],
    ['con espacios', ' #FF8800'],
    ['vacío', ''],
    ['un nombre de color', 'red'],
  ])('rechaza un color %s', (_name, value) => {
    expect(isBrandColor(value)).toBe(false);
  });
});

describe('normalizeBrandColor', () => {
  it('lo deja en mayúsculas', () => {
    expect(normalizeBrandColor('#ff8800')).toBe('#FF8800');
    expect(normalizeBrandColor('#FF8800')).toBe('#FF8800');
  });
});
