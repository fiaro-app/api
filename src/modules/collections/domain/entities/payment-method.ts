/**
 * Medio con el que el cliente pagó. El cuadre usa `CASH` para saber cuánto efectivo entrega el
 * cobrador (PRODUCT.md §5). Mismos valores que `PaymentMethodSchema` de `@fiaro-app/contracts`;
 * el dominio no importa el contrato (regla de dependencia, ARCHITECTURE.md §3).
 */
export type PaymentMethod = 'CASH' | 'NEQUI' | 'TRANSFER';
