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
});
