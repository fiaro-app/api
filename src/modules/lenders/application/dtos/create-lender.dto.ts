import type { Weekday } from '@fiaro-app/contracts';

/** Datos con los que se da de alta a un prestamista. */
export interface CreateLenderInput {
  /** El Tenant dueño de este prestamista. */
  readonly tenantId: string;
  /** Nombre del negocio; el contrato compartido (`LenderSchema`) define sus límites. */
  readonly name: string;
}

/** El prestamista creado: lo que el alta devuelve a quien la pidió. */
export interface CreatedLender {
  /** Identificador del prestamista (UUIDv7). */
  readonly id: string;
  /** El Tenant dueño de este prestamista. */
  readonly tenantId: string;
  /** Nombre del negocio, sin espacios sobrantes. */
  readonly name: string;
  /** URL del logo, o `null`: no hay carga de archivos al dar de alta. */
  readonly logoUrl: string | null;
  /** Días de la semana en que no se cobra. */
  readonly nonWorkingWeekdays: readonly Weekday[];
  /** Si los festivos nacionales de Colombia tampoco cuentan como días de cobro. */
  readonly skipNationalHolidays: boolean;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}
