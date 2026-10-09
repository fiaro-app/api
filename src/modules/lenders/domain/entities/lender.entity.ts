import type { Weekday } from '@/shared/domain/value-objects/weekday.js';

/** Datos con los que se construye un {@link Lender}. */
export interface LenderProps {
  /** Identificador del prestamista (UUIDv7). */
  readonly id: string;
  /** El Tenant dueño de este prestamista. */
  readonly tenantId: string;
  /** Nombre del negocio. */
  readonly name: string;
  /** URL del logo, o `null` si no tiene uno todavía. */
  readonly logoUrl: string | null;
  /** Color de marca `#RRGGBB` en mayúsculas, o `null` para el de Fiaro. */
  readonly brandColor: string | null;
  /** Días de la semana en que no se cobra: no generan cuota esperada ni mora. */
  readonly nonWorkingWeekdays: readonly Weekday[];
  /** Si es `true`, los festivos nacionales de Colombia tampoco cuentan como días de cobro. */
  readonly skipNationalHolidays: boolean;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/**
 * La operación de préstamo: su cartera, cobradores y clientes están aislados de los demás
 * prestamistas, incluso de los del mismo Tenant (PRODUCT.md §5).
 */
export class Lender {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly logoUrl: string | null,
    public readonly brandColor: string | null,
    public readonly nonWorkingWeekdays: readonly Weekday[],
    public readonly skipNationalHolidays: boolean,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye al prestamista con sus datos ya validados.
   *
   * @param props - Datos del prestamista.
   */
  static create(props: LenderProps): Lender {
    return new Lender(
      props.id,
      props.tenantId,
      props.name,
      props.logoUrl,
      props.brandColor,
      props.nonWorkingWeekdays,
      props.skipNationalHolidays,
      props.createdAt,
    );
  }
}
