import type { ClientRisk } from '@/modules/dashboard/domain/client-risk.js';

/** Cuántos clientes se pueden puntuar en una consulta. */
export const MAX_RISK_CLIENTS = 50;

/** Entrada de `GetClientsRiskUseCase`. */
export interface GetClientsRiskInput {
  readonly lenderId: string;
  /** Hasta {@link MAX_RISK_CLIENTS} clientes. */
  readonly clientIds: readonly string[];
}

/** El riesgo de un cliente, con cuántos préstamos tiene registrados en el negocio. */
export interface ClientRiskEntry extends ClientRisk {
  readonly clientId: string;
  /** Préstamos del cliente en este negocio, sin contar los cancelados; 0 si es nuevo. */
  readonly loansCount: number;
}
