import type { VisitOutcome } from '@/modules/collections/domain/entities/visit-outcome.js';

/** Datos con los que se construye una {@link CollectionVisit}. */
export interface CollectionVisitProps {
  /** Identificador de la visita (UUIDv7), generado por el dispositivo (D-29). */
  readonly id: string;
  /** El préstamo visitado. */
  readonly loanId: string;
  /** La membresía (rol `COLLECTOR`) que hizo la visita. */
  readonly collectorMembershipId: string;
  readonly outcome: VisitOutcome;
  /** Cuota que se esperaba cobrar en ese momento, congelada para que los reportes no cambien. */
  readonly expectedAmount: number;
  /** Solo con `RESCHEDULED`: fecha `AAAA-MM-DD` en la que el préstamo reaparece en la ruta. */
  readonly promisedDate: string | null;
  /** Hora real de la visita según el dispositivo. */
  readonly occurredAt: Date;
  /** Hora en que la visita llegó al servidor. */
  readonly createdAt: Date;
}

/**
 * Cada intento de cobro: bitácora de campo (PRODUCT.md §5). Se puede registrar sin conexión: su
 * `id` lo genera el dispositivo y reenviarla no la duplica (D-29). Si hubo dinero, genera un
 * {@link Payment} en la misma operación.
 */
export class CollectionVisit {
  private constructor(
    public readonly id: string,
    public readonly loanId: string,
    public readonly collectorMembershipId: string,
    public readonly outcome: VisitOutcome,
    public readonly expectedAmount: number,
    public readonly promisedDate: string | null,
    public readonly occurredAt: Date,
    public readonly createdAt: Date,
  ) {}

  /** @param props - Datos de la visita. */
  static create(props: CollectionVisitProps): CollectionVisit {
    return new CollectionVisit(
      props.id,
      props.loanId,
      props.collectorMembershipId,
      props.outcome,
      props.expectedAmount,
      props.promisedDate,
      props.occurredAt,
      props.createdAt,
    );
  }
}
