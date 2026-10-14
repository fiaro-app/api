import type { Weekday } from '@fiaro-app/contracts';

/** Los datos públicos de un prestamista, tal como los describe `LenderSchema`. */
export interface LenderDetails {
  /** Identificador del prestamista (UUIDv7). */
  readonly id: string;
  /** El Tenant dueño de este prestamista. */
  readonly tenantId: string;
  /** Nombre del negocio. */
  readonly name: string;
  /** URL del logo, o `null` si no tiene uno. */
  readonly logoUrl: string | null;
  /** Color de marca `#RRGGBB` en mayúsculas, o `null` para el de Fiaro. */
  readonly brandColor: string | null;
  /** Días de la semana en que no se cobra. */
  readonly nonWorkingWeekdays: readonly Weekday[];
  /** Si los festivos nacionales de Colombia tampoco cuentan como días de cobro. */
  readonly skipNationalHolidays: boolean;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/** Datos con los que se actualiza un prestamista: solo lo que cambia. */
export interface UpdateLenderInput {
  /** El prestamista a actualizar. */
  readonly lenderId: string;
  /** Nombre nuevo, o ausente si no cambia. */
  readonly name?: string;
  /** URL del logo nueva, o `null` para quitarlo; ausente si no cambia. */
  readonly logoUrl?: string | null;
  /** Color de marca `#RRGGBB` nuevo, o `null` para volver al de Fiaro; ausente si no cambia. */
  readonly brandColor?: string | null;
  /** Días sin cobro nuevos, o ausente si no cambian. */
  readonly nonWorkingWeekdays?: readonly Weekday[];
  /** Si se saltan los festivos nacionales, o ausente si no cambia. */
  readonly skipNationalHolidays?: boolean;
}
