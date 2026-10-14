import type { LoanFrequency } from '@/modules/loans/domain/entities/loan-frequency.js';
import type { LoanStatus } from '@/modules/loans/domain/entities/loan-status.js';

/** Los datos públicos de un préstamo, tal como los describe `LoanSchema`. */
export interface LoanDetails {
  /** Identificador del préstamo (UUIDv7). */
  readonly id: string;
  /** El cliente que lo solicitó. */
  readonly clientId: string;
  /** Monto prestado, en pesos colombianos. */
  readonly principalAmount: number;
  /** Número de cuotas pactadas. */
  readonly installmentCount: number;
  /** Valor de cada cuota, en pesos colombianos. */
  readonly installmentValue: number;
  /** Lo pactado en total. */
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

/** Datos con los que se da de alta un préstamo. */
export interface CreateLoanInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** La membresía que lo da de alta, resuelta por `LenderScopeGuard`. */
  readonly membershipId: string;
  /** El cliente que lo solicita. */
  readonly clientId: string;
  /** Monto prestado, en pesos colombianos. */
  readonly principalAmount: number;
  /** Número de cuotas pactadas. */
  readonly installmentCount: number;
  /** Valor de cada cuota, en pesos colombianos. */
  readonly installmentValue: number;
  /** Lo pactado en total. */
  readonly totalPayable: number;
  /** Cada cuánto se cobra una cuota. */
  readonly frequency: LoanFrequency;
  /** Fecha de calendario en que arranca el préstamo (`AAAA-MM-DD`). */
  readonly startDate: string;
}

/** Criterio y paginación de {@link ListLoansUseCase}. */
export interface ListLoansInput {
  /** El prestamista dueño de los préstamos. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Solo los préstamos de este cliente; ausente para listar los de todos. */
  readonly clientId?: string;
  /** Solo los préstamos en este estado; ausente para listar todos. */
  readonly status?: LoanStatus;
  /** Solo estos préstamos (por ejemplo, los que un cobrador tiene asignados hoy); ausente para no acotar. */
  readonly ids?: readonly string[];
  /**
   * Solo los que estaban abiertos justo antes de este instante: creados antes y sin cerrar o
   * cerrados desde entonces. Lo usan las estadísticas del período anterior (D-122).
   */
  readonly openAt?: Date;
}

/** Una página de préstamos. */
export interface LoansPageResult {
  /** Los préstamos de esta página. */
  readonly items: readonly LoanDetails[];
  /** Cuántos préstamos cumplen el criterio en total, sin paginar. */
  readonly total: number;
}
