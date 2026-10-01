/** Cuántos días se suman a la Pascua para llegar a cada festivo que se calcula a partir de ella. */
const EASTER_OFFSET_DAYS = {
  juevesSanto: -3,
  viernesSanto: -2,
  ascension: 39,
  corpusChristi: 60,
  sagradoCorazon: 68,
} as const;

/** `MM-DD` de los festivos de fecha fija que nunca se corren de lunes (Ley 51 de 1983). */
const FIXED_NO_SHIFT: readonly string[] = [
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '07-20', // Día de la Independencia
  '08-07', // Batalla de Boyacá
  '12-08', // La Inmaculada Concepción
  '12-25', // Navidad
];

/** `MM-DD` de los festivos de fecha fija que sí se corren al lunes siguiente si no caen en uno. */
const FIXED_SHIFT_TO_MONDAY: readonly string[] = [
  '01-06', // Reyes Magos
  '03-19', // San José
  '06-29', // San Pedro y San Pablo
  '08-15', // La Asunción de la Virgen
  '10-12', // Día de la Raza
  '11-01', // Todos los Santos
  '11-11', // Independencia de Cartagena
];

/** @param year - Año en curso (`UTC`, evita el salto de un día por la zona horaria del proceso). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthDay = h + l - 7 * m + 114;
  const month = Math.floor(monthDay / 31);
  const day = (monthDay % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** @param date - Fecha en UTC. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Si no cae en lunes, la corre al lunes siguiente (Ley 51 de 1983, "Ley Emiliani"). */
function shiftToMonday(date: Date): Date {
  const MONDAY = 1;
  const daysUntilMonday = (MONDAY - date.getUTCDay() + 7) % 7;
  return addDays(date, daysUntilMonday);
}

/** @param date - Fecha en UTC. */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Los 18 festivos nacionales de Colombia de un año, como fechas `AAAA-MM-DD`, ordenadas. Fijos
 * (`FIXED_NO_SHIFT`) y los dos de Semana Santa que se mueven con la Pascua pero nunca se corren
 * de lunes (Jueves y Viernes Santo); el resto (`FIXED_SHIFT_TO_MONDAY` y los tres que dependen de
 * la Pascua) se corren al lunes siguiente si no caen en uno, por la Ley 51 de 1983 ("Ley
 * Emiliani"). La Pascua se calcula con el algoritmo de Gauss/Meeus para el calendario gregoriano.
 *
 * @param year - Año para el que se calculan los festivos.
 */
export function colombianHolidays(year: number): readonly string[] {
  const easter = easterSunday(year);
  const yearText = year.toString();
  const dates: Date[] = [
    ...FIXED_NO_SHIFT.map(
      (monthDay) => new Date(`${yearText}-${monthDay}T00:00:00Z`),
    ),
    addDays(easter, EASTER_OFFSET_DAYS.juevesSanto),
    addDays(easter, EASTER_OFFSET_DAYS.viernesSanto),
    ...FIXED_SHIFT_TO_MONDAY.map((monthDay) =>
      shiftToMonday(new Date(`${yearText}-${monthDay}T00:00:00Z`)),
    ),
    shiftToMonday(addDays(easter, EASTER_OFFSET_DAYS.ascension)),
    shiftToMonday(addDays(easter, EASTER_OFFSET_DAYS.corpusChristi)),
    shiftToMonday(addDays(easter, EASTER_OFFSET_DAYS.sagradoCorazon)),
  ];
  return dates.map(toIsoDate).sort();
}
