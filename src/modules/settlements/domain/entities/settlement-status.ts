/**
 * `PENDING`: enviado por el cobrador, sin revisar. `APPROVED`/`REJECTED`: decisión del
 * prestamista. El rechazo es informativo (no bloquea la ruta); el cobrador puede reenviar con
 * aclaración (D-19).
 */
export type SettlementStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
