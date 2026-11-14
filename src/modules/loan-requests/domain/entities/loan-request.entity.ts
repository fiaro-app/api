import type { LoanRequestStatus } from '@/modules/loan-requests/domain/entities/loan-request-status.js';

/** Cada cuánto se cobra una cuota; los mismos valores que `LoanFrequency` de `loans`. */
export type LoanRequestFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/** Datos del cliente nuevo que el cobrador propone registrar. */
export interface LoanRequestNewClient {
  /** Nombre completo. */
  readonly fullName: string;
  /** Oficio del cliente. */
  readonly occupation: string;
  /** Celular o fijo colombiano en formato E.164. */
  readonly phone: string;
  /** Dirección de residencia o de cobro. */
  readonly address: string;
}

/** Condiciones del préstamo que el cobrador propone. */
export interface LoanRequestTerms {
  /** Monto prestado, en pesos colombianos. */
  readonly principalAmount: number;
  /** Número de cuotas pactadas. */
  readonly installmentCount: number;
  /** Valor de cada cuota, en pesos colombianos. */
  readonly installmentValue: number;
  /** Lo pactado en total. */
  readonly totalPayable: number;
  /** Cada cuánto se cobra una cuota. */
  readonly frequency: LoanRequestFrequency;
  /** Fecha de calendario en que arranca el préstamo (`AAAA-MM-DD`). */
  readonly startDate: string;
}

/** Datos con los que se construye una {@link LoanRequest}. */
export interface LoanRequestProps {
  /** Identificador de la solicitud (UUIDv7). */
  readonly id: string;
  /** El prestamista dueño. */
  readonly lenderId: string;
  /** La membresía del cobrador que la hizo. */
  readonly requestedByMembershipId: string;
  /** El cliente existente, o `null` si la solicitud trae un cliente nuevo. */
  readonly clientId: string | null;
  /** Cédula del cliente, sin separadores. */
  readonly nationalId: string;
  /** Datos del cliente nuevo; `null` cuando `clientId` apunta a uno existente. */
  readonly newClient: LoanRequestNewClient | null;
  /** Las condiciones propuestas. */
  readonly terms: LoanRequestTerms;
  /** Estado de la solicitud. */
  readonly status: LoanRequestStatus;
  /** La membresía que la resolvió, o `null` mientras está pendiente. */
  readonly resolvedByMembershipId: string | null;
  /** Cuándo se resolvió, o `null` mientras está pendiente. */
  readonly resolvedAt: Date | null;
  /** Por qué se rechazó, si el administrador lo escribió. */
  readonly rejectionReason: string | null;
  /** El préstamo creado al aceptarla, o `null` si no se aceptó. */
  readonly loanId: string | null;
  /** Cuándo la hizo el cobrador. */
  readonly createdAt: Date;
}

/**
 * Solicitud de un cobrador para que el administrador cree un préstamo, con un cliente nuevo o uno
 * que el negocio ya tiene. No toca saldos: solo es la propuesta hasta que se acepta o se rechaza.
 */
export class LoanRequest {
  private constructor(
    public readonly id: string,
    public readonly lenderId: string,
    public readonly requestedByMembershipId: string,
    public readonly clientId: string | null,
    public readonly nationalId: string,
    public readonly newClient: LoanRequestNewClient | null,
    public readonly terms: LoanRequestTerms,
    public readonly status: LoanRequestStatus,
    public readonly resolvedByMembershipId: string | null,
    public readonly resolvedAt: Date | null,
    public readonly rejectionReason: string | null,
    public readonly loanId: string | null,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye la solicitud con sus datos ya validados.
   *
   * @param props - Datos de la solicitud.
   */
  static create(props: LoanRequestProps): LoanRequest {
    return new LoanRequest(
      props.id,
      props.lenderId,
      props.requestedByMembershipId,
      props.clientId,
      props.nationalId,
      props.newClient,
      props.terms,
      props.status,
      props.resolvedByMembershipId,
      props.resolvedAt,
      props.rejectionReason,
      props.loanId,
      props.createdAt,
    );
  }
}
