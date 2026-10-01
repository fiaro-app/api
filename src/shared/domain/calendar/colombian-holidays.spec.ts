import { describe, expect, it } from 'vitest';
import { colombianHolidays } from '@/shared/domain/calendar/colombian-holidays.js';

/** `0` domingo .. `6` sábado, igual que `Date.getUTCDay()`. */
function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

describe('colombianHolidays', () => {
  it('da exactamente los 18 festivos oficiales de Colombia', () => {
    expect(colombianHolidays(2026)).toHaveLength(18);
  });

  it('para 2026, da exactamente estas fechas', () => {
    expect(colombianHolidays(2026)).toEqual([
      '2026-01-01',
      '2026-01-12',
      '2026-03-23',
      '2026-04-02',
      '2026-04-03',
      '2026-05-01',
      '2026-05-18',
      '2026-06-08',
      '2026-06-15',
      '2026-06-29',
      '2026-07-20',
      '2026-08-07',
      '2026-08-17',
      '2026-10-12',
      '2026-11-02',
      '2026-11-16',
      '2026-12-08',
      '2026-12-25',
    ]);
  });

  it.each([2024, 2025, 2026, 2027, 2028, 2030])(
    'para %i, los festivos que se corren siempre caen en lunes',
    (year) => {
      const holidays = colombianHolidays(year);
      const yearText = year.toString();
      const fixedNoShift = new Set([
        `${yearText}-01-01`,
        `${yearText}-05-01`,
        `${yearText}-07-20`,
        `${yearText}-08-07`,
        `${yearText}-12-08`,
        `${yearText}-12-25`,
      ]);

      for (const date of holidays) {
        if (fixedNoShift.has(date)) {
          continue;
        }
        const month = Number(date.slice(5, 7));
        const isSemanaSanta = month === 3 || month === 4;
        if (isSemanaSanta && weekdayOf(date) !== 4 && weekdayOf(date) !== 5) {
          continue;
        }
        if (!isSemanaSanta) {
          expect(weekdayOf(date)).toBe(1);
        }
      }
    },
  );

  it.each([2024, 2025, 2026, 2027, 2028, 2030])(
    'para %i, Jueves Santo es jueves y Viernes Santo es viernes, tres y dos días antes de la Pascua',
    (year) => {
      const holidays = colombianHolidays(year);
      const semanaSanta = holidays.filter((date) => {
        const month = Number(date.slice(5, 7));
        return month === 3 || month === 4;
      });
      const [juevesSanto, viernesSanto] = semanaSanta
        .filter((date) => ![1, 2].includes(weekdayOf(date)))
        .sort();

      expect(juevesSanto).toBeDefined();
      expect(viernesSanto).toBeDefined();
      expect(weekdayOf(juevesSanto ?? '')).toBe(4);
      expect(weekdayOf(viernesSanto ?? '')).toBe(5);
    },
  );

  it('siempre da las mismas 18 fechas, ordenadas, para el mismo año', () => {
    expect(colombianHolidays(2026)).toEqual(colombianHolidays(2026));
    const sorted = [...colombianHolidays(2026)].sort();
    expect(colombianHolidays(2026)).toEqual(sorted);
  });
});
