import { describe, expect, it } from 'vitest';
import { CreateLeadRequestSchema } from '@/modules/leads/infrastructure/controllers/schemas/lead-requests.schema.js';

describe('CreateLeadRequestSchema', () => {
  it('acepta nombre, mensaje y un celular', () => {
    expect(
      CreateLeadRequestSchema.safeParse({
        name: 'Ana',
        phone: '300 123 4567',
        message: 'Hola',
      }).success,
    ).toBe(true);
  });

  it('acepta el campo señuelo, vacío o lleno: lo decide el controller', () => {
    expect(
      CreateLeadRequestSchema.safeParse({
        name: 'Ana',
        message: 'Hola',
        website: '',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['sin nombre', { message: 'Hola', phone: '3001234567' }],
    ['sin mensaje', { name: 'Ana', phone: '3001234567' }],
    ['con un nombre vacío', { name: '', message: 'Hola' }],
    [
      'con un campo que la ruta no declara',
      { name: 'Ana', message: 'Hola', plan: 'pro' },
    ],
  ])('rechaza un cuerpo %s', (_name, body) => {
    expect(CreateLeadRequestSchema.safeParse(body).success).toBe(false);
  });
});
