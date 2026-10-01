import { describe, expect, it } from 'vitest';
import { CreatePortfolioRequestSchema } from '@/modules/lenders/infrastructure/controllers/schemas/portfolio-requests.schema.js';

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
