import { toBusinessDate } from '@fiaro-app/contracts';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import { toLoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.mapper.js';
import {
  sumNetPayments,
  sumNetPaymentsAsOf,
} from '@/modules/collections/application/services/sum-net-payments.js';
import { toLoanScheduleInput } from '@/modules/collections/application/services/to-loan-schedule-input.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import { computeLoanBalance } from '@/shared/domain/calendar/loan-balance.js';

/** Lo que hace falta para calcular el saldo de un préstamo. */
export interface CalculateLoanBalanceInput {
  readonly loan: LoanDetails;
  /** Su prestamista, de quien salen los días sin cobro. */
  readonly lender: LenderDetails;
  /** Las visitas del préstamo, con sus pagos y reversiones. */
  readonly records: readonly CollectionVisitRecord[];
  /** La fecha de hoy (`AAAA-MM-DD`, hora de Bogotá). */
  readonly today: string;
  /** Una fecha pasada para el saldo histórico (D-111); ausente para hoy. */
  readonly asOf?: string;
}

/**
 * Calcula el estado financiero (saldo, mora, próxima fecha esperada) de un préstamo. Es el cálculo
 * de {@link GetLoanBalanceUseCase}, aparte para que las listas de préstamos y de clientes con
 * saldo (D-113) lo repitan sin pedir cada préstamo por separado.
 *
 * @remarks
 * Con `asOf` calcula el saldo que tenía el préstamo al final de esa fecha pasada, para comparar
 * períodos (D-111): cuenta solo los pagos y las reversiones hasta ese día
 * ({@link sumNetPaymentsAsOf}) y lo da por cerrado solo si ya se había cerrado entonces. Sin
 * `asOf`, es el de hoy, con el estado y los pagos actuales. Quien pide un día pasado decide si el
 * préstamo ya existía entonces: aquí no se comprueba.
 *
 * @param input - El préstamo, su prestamista, sus visitas y la fecha.
 * @throws {@link RangeError} Ver `computeLoanBalance`.
 */
export function calculateLoanBalance(
  input: CalculateLoanBalanceInput,
): LoanBalanceDetails {
  const { loan, lender, records, today, asOf } = input;
  const calculatedAsOf = asOf ?? today;
  const balance = computeLoanBalance({
    ...toLoanScheduleInput(loan, lender),
    totalPayable: loan.totalPayable,
    totalPaid:
      asOf === undefined
        ? sumNetPayments(records)
        : sumNetPaymentsAsOf(records, asOf),
    asOf: calculatedAsOf,
    isClosed: isClosedAsOf(loan, asOf),
  });
  return toLoanBalanceDetails(loan.id, calculatedAsOf, balance);
}

/**
 * @param loan - El préstamo.
 * @param asOf - Fecha pasada a la que se mira; ausente para hoy.
 * @returns Si el préstamo estaba cerrado (`PAID_OFF` o `CANCELED`) en ese momento.
 */
function isClosedAsOf(loan: LoanDetails, asOf: string | undefined): boolean {
  if (loan.status === 'ACTIVE') {
    return false;
  }
  if (asOf === undefined || loan.closedAt === null) {
    return true;
  }
  return toBusinessDate(loan.closedAt) <= asOf;
}
