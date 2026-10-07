/** Lo que un prestamista tiene en mora: cuántos préstamos y cuánto suman lo vencido, en pesos. */
export interface MoraTally {
  /** Préstamos con saldo vencido mayor que cero. */
  readonly loansInMora: number;
  /** La suma de lo vencido de esos préstamos. */
  readonly overdueAmount: number;
}

/** Lo que `GetLoanBalanceUseCase` devuelve por préstamo; aquí solo importa lo vencido. */
export interface LoanOverdue {
  /** Lo que debió pagarse a la fecha de hoy y no se ha pagado. */
  readonly overdueAmount: number;
}

/**
 * Cuenta los préstamos en mora. Un préstamo está en mora cuando tiene saldo vencido a la fecha de
 * hoy (PRODUCT.md §5, D-84): lo que debió pagarse y no se ha pagado.
 *
 * @param balances - El saldo vencido de cada préstamo del prestamista.
 * @returns Cuántos están en mora y cuánto suman lo vencido.
 */
export function tallyMora(balances: readonly LoanOverdue[]): MoraTally {
  return balances.reduce<MoraTally>(
    (tally, balance) =>
      balance.overdueAmount > 0
        ? {
            loansInMora: tally.loansInMora + 1,
            overdueAmount: tally.overdueAmount + balance.overdueAmount,
          }
        : tally,
    { loansInMora: 0, overdueAmount: 0 },
  );
}
