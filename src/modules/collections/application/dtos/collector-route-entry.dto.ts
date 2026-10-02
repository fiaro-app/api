/** Una fila de la ruta del día de un cobrador: un préstamo con su cliente y su estado financiero. */
export interface CollectorRouteEntry {
  /** El préstamo a cobrar. */
  readonly loanId: string;
  /** El cliente del préstamo. */
  readonly clientId: string;
  /** Nombre completo del cliente, para la fila. */
  readonly clientFullName: string;
  /** `totalPayable` menos lo pagado; nunca baja de cero. */
  readonly balance: number;
  /** Cuánto de lo esperado hasta `date` sigue sin pagar; cero si está al día. */
  readonly overdueAmount: number;
  /** Días desde la cuota impaga más antigua; cero si está al día. */
  readonly overdueDays: number;
  /** Próxima fecha en la que se espera un pago; `null` si no le quedan cuotas. */
  readonly nextDueDate: string | null;
}
