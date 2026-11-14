/** Qué período se pide y para quién: la persona y el negocio con el que opera su sesión. */
export interface GetConsolidatedStatsInput {
  /** La persona autenticada: solo suma los negocios que ella administra. */
  readonly userId: string;
  /** El negocio con el que opera la sesión; define el Tenant (y el plan) del consolidado. */
  readonly lenderId: string;
  /** Primera fecha del rango (`AAAA-MM-DD`); por defecto, el primer día del mes actual. */
  readonly from?: string;
  /** Última fecha del rango (`AAAA-MM-DD`); por defecto, hoy. */
  readonly to?: string;
}

/** Las cifras de cartera y cobro de un negocio, o de la suma de varios. */
export interface ConsolidatedFigures {
  /** Suma del saldo de los préstamos `ACTIVE`. */
  readonly totalPortfolio: number;
  /** Suma del saldo de los que tienen algo vencido sin pagar hoy. */
  readonly portfolioAtRisk: number;
  /** `portfolioAtRisk / totalPortfolio`, de 0 a 1. `null` si la cartera es cero. */
  readonly arrearsRate: number | null;
  /** Lo que vencía en el período. */
  readonly expectedAmount: number;
  /** Lo cobrado en el período, sin reversiones. */
  readonly collectedAmount: number;
  /** `collectedAmount / expectedAmount`, de 0 a 1. `null` si no se esperaba nada. */
  readonly effectiveness: number | null;
}

/** Un negocio dentro del consolidado. */
export interface ConsolidatedLender extends ConsolidatedFigures {
  readonly lenderId: string;
  readonly name: string;
}

/** Las cifras de todos los negocios que administra la persona, cada uno y el total (D-155). */
export interface ConsolidatedStats {
  readonly from: string;
  readonly to: string;
  readonly lenders: readonly ConsolidatedLender[];
  readonly totals: ConsolidatedFigures;
}
