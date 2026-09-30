import { describe, expect, it } from 'vitest';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import {
  toLender,
  toLenderCreateInput,
  toLenderUpdateInput,
} from '@/modules/lenders/infrastructure/persistence/lender.mapper.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const lender = Lender.create({
  id: 'lender-1',
  tenantId: 'tenant-1',
  name: 'Préstamos Ana',
  logoUrl: null,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  createdAt: CREATED_AT,
});

describe('toLenderCreateInput', () => {
  it('convierte al prestamista en la fila de lenders, con su cartera General anidada', () => {
    expect(toLenderCreateInput(lender, 'portfolio-1')).toEqual({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt: CREATED_AT,
      portfolios: {
        create: {
          id: 'portfolio-1',
          name: 'General',
          isDefault: true,
          createdAt: CREATED_AT,
        },
      },
    });
  });
});

describe('toLenderUpdateInput', () => {
  it('convierte al prestamista actualizado en los campos que se guardan', () => {
    expect(toLenderUpdateInput(lender)).toEqual({
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
    });
  });
});

describe('toLender', () => {
  it('convierte la fila de lenders en la entidad de dominio', () => {
    const row = {
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: 'https://example.com/logo.png',
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: true,
      createdAt: CREATED_AT,
    };

    const found = toLender(row as unknown as Parameters<typeof toLender>[0]);

    expect(found.id).toBe('lender-1');
    expect(found.tenantId).toBe('tenant-1');
    expect(found.name).toBe('Préstamos Ana');
    expect(found.logoUrl).toBe('https://example.com/logo.png');
    expect(found.nonWorkingWeekdays).toEqual(['SUNDAY']);
    expect(found.skipNationalHolidays).toBe(true);
    expect(found.createdAt).toBe(CREATED_AT);
  });
});
