import type { LoanFrequency } from '@/modules/loans/domain/entities/loan-frequency.js';
import type { LoanStatus } from '@/modules/loans/domain/entities/loan-status.js';

/** Datos con los que se construye un {@link Loan}. */
export interface LoanProps {
  /** Identificador del préstamo (UUIDv7). */
  readonly id: string;
  /** El prestamista dueño de este préstamo. */
  readonly lenderId: string;
  /** El cliente que lo solicitó. */
  readonly clientId: string;
  /** Monto prestado, en pesos colombianos. */
  readonly principalAmount: number;
  /** Número de cuotas pactadas. */
  readonly installmentCount: number;
  /** Valor de cada cuota, en pesos colombianos. */
  readonly installmentValue: number;
  /** Lo pactado en total; no se exige que sea `installmentCount × installmentValue`. */
  readonly totalPayable: number;
  /** Cada cuánto se cobra una cuota. */
  readonly frequency: LoanFrequency;
  /** Fecha de calendario en que arranca el préstamo (`AAAA-MM-DD`). */
  readonly startDate: string;
  /** Estado del préstamo. */
  readonly status: LoanStatus;
  /** La membresía que lo dio de alta. */
  readonly createdByMembershipId: string;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
  /** Cuándo pasó a `PAID_OFF` o `CANCELED`, o `null` mientras sigue `ACTIVE`. */
  readonly closedAt: Date | null;
}

/**
 * Acuerdo de pago pactado entre el prestamista y su cliente. Fiaro no calcula intereses: todos
 * los montos los ingresa el prestamista (PRODUCT.md §5).
 */
export class Loan {
  private constructor(
    public readonly id: string,
    public readonly lenderId: string,
    public readonly clientId: string,
    public readonly principalAmount: number,
    public readonly installmentCount: number,
    public readonly installmentValue: number,
    public readonly totalPayable: number,
    public readonly frequency: LoanFrequency,
    public readonly startDate: string,
    public readonly status: LoanStatus,
    public readonly createdByMembershipId: string,
    public readonly createdAt: Date,
    public readonly closedAt: Date | null,
  ) {}

  /**
   * Construye al préstamo con sus datos ya validados.
   *
   * @param props - Datos del préstamo.
   */
  static create(props: LoanProps): Loan {
    return new Loan(
      props.id,
      props.lenderId,
      props.clientId,
      props.principalAmount,
      props.installmentCount,
      props.installmentValue,
      props.totalPayable,
      props.frequency,
      props.startDate,
      props.status,
      props.createdByMembershipId,
      props.createdAt,
      props.closedAt,
    );
  }
}
