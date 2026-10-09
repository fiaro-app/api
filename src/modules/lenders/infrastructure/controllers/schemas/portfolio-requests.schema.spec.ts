import { describe, expect, it } from 'vitest';
import {
  CreatePortfolioRequestSchema,
  UpdatePortfolioRequestSchema,
} from '@/modules/lenders/infrastructure/controllers/schemas/portfolio-requests.schema.js';

describe('CreatePortfolioRequestSchema', () => {
  it('acepta un nombre', () => {
    expect(
      CreatePortfolioRequestSchema.safeParse({ name: 'Zona Norte' }).success,
    ).toBe(true);
  });

  it('rechaza un cuerpo sin nombre', () => {
    expect(CreatePortfolioRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      CreatePortfolioRequestSchema.safeParse({
        name: 'Zona Norte',
        isDefault: true,
      }).success,
    ).toBe(false);
  });
});

describe('UpdatePortfolioRequestSchema', () => {
  it('acepta un nombre', () => {
    expect(
      UpdatePortfolioRequestSchema.safeParse({ name: 'Zona Sur' }).success,
    ).toBe(true);
  });

  it.each([
    ['un cuerpo sin nombre', {}],
    ['un nombre vacío', { name: '' }],
    ['un campo que la ruta no declara', { name: 'Zona Sur', isDefault: true }],
  ])('rechaza %s', (_name, body) => {
    expect(UpdatePortfolioRequestSchema.safeParse(body).success).toBe(false);
  });
});
