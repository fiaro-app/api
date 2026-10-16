import { describe, expect, it } from 'vitest';
import {
  addMonths,
  extendPeriod,
} from '@/modules/subscriptions/domain/policies/extend-period.js';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('addMonths', () => {
  it('suma meses de calendario', () => {
    expect(addMonths(at('2026-10-16'), 1)).toEqual(at('2026-11-16'));
    expect(addMonths(at('2026-12-16'), 1)).toEqual(at('2027-01-16'));
    expect(addMonths(at('2026-10-16'), 12)).toEqual(at('2027-10-16'));
  });

  it('no se pasa del último día del mes de llegada', () => {
    expect(addMonths(at('2026-01-31'), 1)).toEqual(at('2026-02-28'));
    expect(addMonths(at('2028-01-31'), 1)).toEqual(at('2028-02-29'));
    expect(addMonths(at('2026-03-31'), 1)).toEqual(at('2026-04-30'));
  });
});

describe('extendPeriod', () => {
  it('suma al final del período vigente: no se pierden los días ya pagados', () => {
    expect(extendPeriod(at('2026-11-10'), at('2026-10-16'), 1)).toEqual(
      at('2026-12-10'),
    );
  });

  it('con el período vencido suma a partir de hoy', () => {
    expect(extendPeriod(at('2026-09-01'), at('2026-10-16'), 1)).toEqual(
      at('2026-11-16'),
    );
  });

  it('el instante exacto del vencimiento cuenta como vencido', () => {
    expect(extendPeriod(at('2026-10-16'), at('2026-10-16'), 1)).toEqual(
      at('2026-11-16'),
    );
  });
});
