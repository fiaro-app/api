import type { SettlementStatus } from '@/modules/settlements/domain/entities/settlement-status.js';

/** Datos con los que se construye un {@link DailySettlement}. */
export interface DailySettlementProps {
  /** Identificador del cuadre (UUIDv7). */
  readonly id: string;
  /** El cobrador dueño de este cuadre. */
  readonly collectorMembershipId: string;
  /** Fecha de calendario del cuadre (`AAAA-MM-DD`). */
  readonly date: string;
  /** Lo esperado, declarado por el cobrador. */
  readonly expectedAmount: number;
  /** Lo cobrado, suma de `collectedCash + collectedNequi + collectedTransfer`. */
  readonly collectedAmount: number;
  /** Lo cobrado en efectivo. */
  readonly collectedCash: number;
  /** Lo cobrado por Nequi. */
  readonly collectedNequi: number;
  /** Lo cobrado por transferencia. */
  readonly collectedTransfer: number;
  /** Estado del cuadre. */
  readonly status: SettlementStatus;
  /** Nota del cobrador; obligatoria cuando `collectedAmount` difiere de `expectedAmount` (D-19). */
  readonly collectorNote: string | null;
  /** Comentario del prestamista al revisar, sobre todo al rechazar. */
  readonly reviewNote: string | null;
  /** La membresía que lo revisó, o `null` mientras sigue `PENDING`. */
  readonly reviewedByMembershipId: string | null;
  /** Cuándo se revisó, o `null` mientras sigue `PENDING`. */
  readonly reviewedAt: Date | null;
  /** Último envío del cobrador: se actualiza en cada reenvío, a diferencia de `createdAt`. */
  readonly submittedAt: Date;
  /** Cuándo se creó la primera vez. */
  readonly createdAt: Date;
}

/**
 * Cierre diario de un cobrador: lo esperado contra lo cobrado, con desglose por medio de pago
 * (PRODUCT.md §5). Los montos son los que el cobrador declaró al cerrar — Fiaro no los recalcula
 * contra las visitas/pagos del día, ni siquiera si después se reversa alguno (D-36).
 */
export class DailySettlement {
  private constructor(
    public readonly id: string,
    public readonly collectorMembershipId: string,
    public readonly date: string,
    public readonly expectedAmount: number,
    public readonly collectedAmount: number,
    public readonly collectedCash: number,
    public readonly collectedNequi: number,
    public readonly collectedTransfer: number,
    public readonly status: SettlementStatus,
    public readonly collectorNote: string | null,
    public readonly reviewNote: string | null,
    public readonly reviewedByMembershipId: string | null,
    public readonly reviewedAt: Date | null,
    public readonly submittedAt: Date,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye el cuadre con sus datos ya validados.
   *
   * @param props - Datos del cuadre.
   */
  static create(props: DailySettlementProps): DailySettlement {
    return new DailySettlement(
      props.id,
      props.collectorMembershipId,
      props.date,
      props.expectedAmount,
      props.collectedAmount,
      props.collectedCash,
      props.collectedNequi,
      props.collectedTransfer,
      props.status,
      props.collectorNote,
      props.reviewNote,
      props.reviewedByMembershipId,
      props.reviewedAt,
      props.submittedAt,
      props.createdAt,
    );
  }
}
