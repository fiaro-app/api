/**
 * - `ACTIVE`: tiene saldo pendiente. Único estado que se puede crear hoy.
 * - `PAID_OFF`: el saldo llegó a cero. Inalcanzable hasta que exista `payments`.
 * - `CANCELED`: el prestamista lo anuló por un error de registro, antes de recibir pagos.
 *   Inalcanzable hasta que exista el caso de uso de cancelación (siguiente PR).
 *
 * Mismos valores que `LoanStatusSchema` de `@fiaro-app/contracts`; el dominio no importa el
 * contrato (regla de dependencia, ARCHITECTURE.md §3), así que los repite.
 */
export type LoanStatus = 'ACTIVE' | 'PAID_OFF' | 'CANCELED';
