import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';

/** Un préstamo de la lista, con su saldo, su mora y el cobrador que lo tiene hoy. */
export interface LoanListItem {
  readonly loan: LoanDetails;
  /** Nombre completo del cliente, para que la lista no tenga que buscarlo aparte. */
  readonly clientFullName: string;
  /** `totalPayable` menos lo pagado; nunca baja de cero. */
  readonly balance: number;
  /** Cuánto de lo esperado hasta hoy sigue sin pagar; cero si está al día o ya cerró. */
  readonly overdueAmount: number;
  /** Días desde la cuota impaga más antigua; cero si está al día o ya cerró. */
  readonly overdueDays: number;
  /** Próxima fecha esperada de pago; `null` si el préstamo ya cerró o no le quedan cuotas. */
  readonly nextDueDate: string | null;
  /** Quien lo cobra hoy, o `null` si ninguno lo tiene asignado. */
  readonly collector: {
    readonly membershipId: string;
    readonly fullName: string;
  } | null;
}

/** Entrada de {@link ListLoansWithBalanceUseCase}: la de `ListLoansUseCase` más el cobrador. */
export interface ListLoansWithBalanceInput {
  readonly lenderId: string;
  readonly page: number;
  readonly pageSize: number;
  readonly clientId?: string;
  readonly status?: LoanDetails['status'];
  /** Solo los préstamos que este cobrador tiene asignados hoy. */
  readonly collectorMembershipId?: string;
}

/** Una página de {@link ListLoansWithBalanceUseCase}. */
export interface LoansWithBalancePage {
  readonly items: readonly LoanListItem[];
  /** Cuántos préstamos cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

/** Un cliente de la lista, con lo que debe y lo que tiene vencido entre sus préstamos activos. */
export interface ClientListItem {
  readonly client: ClientDetails;
  /** Suma del saldo de sus préstamos `ACTIVE`; cero si no tiene ninguno. */
  readonly balance: number;
  /** Suma de lo vencido y sin pagar entre sus préstamos `ACTIVE`. */
  readonly overdueAmount: number;
  /** El mayor de los días de mora entre sus préstamos `ACTIVE`; cero si está al día. */
  readonly overdueDays: number;
  /** Cuántos préstamos `ACTIVE` tiene. */
  readonly activeLoans: number;
}

/** Una página de {@link ListClientsWithBalanceUseCase}. */
export interface ClientsWithBalancePage {
  readonly items: readonly ClientListItem[];
  /** Cuántos clientes cumplen el criterio en total, sin paginar. */
  readonly total: number;
}
