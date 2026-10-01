/** Estado financiero de un préstamo, en el momento en que se consultó. */
export interface LoanBalanceDetails {
  /** El préstamo consultado. */
  readonly loanId: string;
  /** Fecha `AAAA-MM-DD` con la que se calculó. */
  readonly asOf: string;
  /** `totalPayable` menos lo pagado; nunca baja de cero. */
  readonly balance: number;
  /** Suma de las cuotas cuya fecha esperada ya llegó. */
  readonly totalExpectedToDate: number;
  /** Cuánto de lo esperado hasta hoy sigue sin pagar; cero si está al día. */
  readonly overdueAmount: number;
  /** Días desde la cuota impaga más antigua; cero si está al día o el préstamo ya cerró. */
  readonly overdueDays: number;
  /** Próxima fecha en la que se espera un pago; `null` si el préstamo ya cerró o no le quedan cuotas. */
  readonly nextDueDate: string | null;
  /** Fecha de la cuota impaga más antigua; `null` si no hay mora. */
  readonly firstOverdueDate: string | null;
}
