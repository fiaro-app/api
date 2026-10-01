import { describe, expect, it } from 'vitest';
import type { PortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.dto.js';
import {
  toPortfolioResponse,
  toPortfoliosResponse,
} from '@/modules/lenders/infrastructure/controllers/schemas/portfolio-responses.schema.js';

const DETAILS: PortfolioDetails = {
  id: 'portfolio-1',
  name: 'Zona Norte',
  isDefault: false,
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

describe('toPortfolioResponse', () => {
  it('convierte la fecha a texto ISO', () => {
    expect(toPortfolioResponse(DETAILS)).toEqual({
      id: 'portfolio-1',
      name: 'Zona Norte',
      isDefault: false,
      createdAt: '2026-09-30T00:00:00.000Z',
    });
  });
});

describe('toPortfoliosResponse', () => {
  it('convierte cada cartera de la lista', () => {
    expect(toPortfoliosResponse([DETAILS])).toEqual([
      {
        id: 'portfolio-1',
        name: 'Zona Norte',
        isDefault: false,
        createdAt: '2026-09-30T00:00:00.000Z',
      },
    ]);
  });

  it('convierte una lista vacía en una lista vacía', () => {
    expect(toPortfoliosResponse([])).toEqual([]);
  });
});
