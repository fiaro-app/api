import type {
  LoanRequestFrequency,
  LoanRequestNewClient,
} from '@/modules/loan-requests/domain/entities/loan-request.entity.js';
import type { LoanRequestStatus } from '@/modules/loan-requests/domain/entities/loan-request-status.js';

/** Los datos públicos de una solicitud de préstamo. */
export interface LoanRequestDetails {
  /** Identificador de la solicitud (UUIDv7). */
  readonly id: string;
  /** Estado de la solicitud. */
  readonly status: LoanRequestStatus;
  /** La membresía del cobrador que la hizo. */
  readonly requestedByMembershipId: string;
  /** El cliente existente, o `null` si propone uno nuevo. */
  readonly clientId: string | null;
  /** Cédula del cliente. */
  readonly nationalId: string;
  /** Datos del cliente nuevo, o `null` si el cliente ya existía. */
  readonly newClient: LoanRequestNewClient | null;
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
  /** Cuándo se resolvió, o `null` si está pendiente. */
  readonly resolvedAt: Date | null;
  /** Motivo del rechazo, si el administrador lo escribió. */
  readonly rejectionReason: string | null;
  /** El préstamo creado al aceptarla, o `null`. */
  readonly loanId: string | null;
  /** Cuándo la hizo el cobrador. */
  readonly createdAt: Date;
}

/** Datos con los que un cobrador hace una solicitud. */
export interface CreateLoanRequestInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** La membresía del cobrador, resuelta por `LenderScopeGuard`. */
  readonly membershipId: string;
  /** Cédula del cliente, con los separadores que traiga. */
  readonly nationalId: string;
  /** Datos del cliente; obligatorios solo si la cédula no es de un cliente del negocio. */
  readonly client?: LoanRequestNewClient;
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

/** Datos con los que el administrador acepta una solicitud, con los ajustes que quiera. */
export interface ApproveLoanRequestInput {
  /** La solicitud. */
  readonly id: string;
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** La membresía del administrador, resuelta por `LenderScopeGuard`. */
  readonly membershipId: string;
  /** Ajustes a los datos del cliente nuevo; no aplican si el cliente ya existía. */
  readonly client?: Partial<LoanRequestNewClient>;
  /** Ajustes a las condiciones del préstamo. */
  readonly loan?: Partial<{
    readonly principalAmount: number;
    readonly installmentCount: number;
    readonly installmentValue: number;
    readonly totalPayable: number;
    readonly frequency: LoanRequestFrequency;
    readonly startDate: string;
  }>;
}

/** Datos con los que el administrador rechaza una solicitud. */
export interface RejectLoanRequestInput {
  /** La solicitud. */
  readonly id: string;
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** La membresía del administrador, resuelta por `LenderScopeGuard`. */
  readonly membershipId: string;
  /** Por qué se rechaza; opcional. */
  readonly reason?: string;
}

/** Criterio y paginación de `ListLoanRequestsUseCase`. */
export interface ListLoanRequestsInput {
  /** El prestamista dueño. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Solo las de este estado; ausente para todas. */
  readonly status?: LoanRequestStatus;
  /** Solo las de este cobrador; ausente para las de todos. */
  readonly requestedByMembershipId?: string;
}

/** Una página de solicitudes. */
export interface LoanRequestsPageResult {
  /** Las solicitudes de esta página. */
  readonly items: readonly LoanRequestDetails[];
  /** Cuántas cumplen el criterio en total, sin paginar. */
  readonly total: number;
}
