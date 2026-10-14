import { describe, expect, it } from 'vitest';
import { UpdateLenderRequestSchema } from '@/modules/lenders/infrastructure/controllers/schemas/lender-requests.schema.js';

describe('UpdateLenderRequestSchema', () => {
  it('acepta solo el nombre', () => {
    expect(
      UpdateLenderRequestSchema.safeParse({ name: 'Financiera Buen Vecino' })
        .success,
    ).toBe(true);
  });

  it('acepta los cuatro campos juntos', () => {
    expect(
      UpdateLenderRequestSchema.safeParse({
        name: 'Financiera Buen Vecino',
        logoUrl: 'https://cdn.fiaro.co/logos/buen-vecino.png',
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: true,
      }).success,
    ).toBe(true);
  });

  it('acepta logoUrl: null (lo quita)', () => {
    expect(UpdateLenderRequestSchema.safeParse({ logoUrl: null }).success).toBe(
      true,
    );
  });

  it('rechaza un cuerpo vacío: no hay nada que actualizar', () => {
    expect(UpdateLenderRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(UpdateLenderRequestSchema.safeParse({ nombre: 'x' }).success).toBe(
      false,
    );
  });

  describe('brandColor', () => {
    it.each(['#FF8800', '#ff8800'])('acepta %s', (brandColor) => {
      expect(UpdateLenderRequestSchema.safeParse({ brandColor }).success).toBe(
        true,
      );
    });

    it('acepta null (vuelve al color de Fiaro) y cuenta como un campo a actualizar', () => {
      expect(
        UpdateLenderRequestSchema.safeParse({ brandColor: null }).success,
      ).toBe(true);
    });

    it.each(['FF8800', '#F80', 'naranja', '#GG8800', ''])(
      'rechaza %j',
      (brandColor) => {
        expect(
          UpdateLenderRequestSchema.safeParse({ brandColor }).success,
        ).toBe(false);
      },
    );
  });
});
