/**
 * Funciones del producto que dependen del plan (D-151), aparte de los topes numéricos (D-144):
 * - `ADVANCED_STATS`: el PDF de estadísticas, el comparativo con el período anterior y los reportes de
 *   riesgo de clientes, mora y desempeño por cobrador.
 * - `EXCEL_IMPORT`: importar clientes y préstamos desde una hoja de cálculo.
 */
export const PLAN_FEATURES = ['ADVANCED_STATS', 'EXCEL_IMPORT'] as const;

/** Una función de {@link PLAN_FEATURES}. */
export type PlanFeature = (typeof PLAN_FEATURES)[number];

/**
 * Qué funciones trae cada plan. La prueba (`TRIAL`) las trae todas: es para probar el producto
 * completo antes de elegir. Individual no trae ninguna. Es código y no una columna de la suscripción
 * a propósito: una función nueva le llega al plan sin migrar a nadie.
 */
export const FEATURES_BY_PLAN: Readonly<
  Record<string, readonly PlanFeature[]>
> = {
  TRIAL: PLAN_FEATURES,
  INDIVIDUAL: [],
  PRO: PLAN_FEATURES,
  TEAM: PLAN_FEATURES,
};

/**
 * @param planCode - El plan del negocio.
 * @returns Las funciones que trae. Un plan que este código no conoce (uno nuevo que aún no se
 * clasificó) las trae todas: no se deja a nadie sin algo que pagó por un descuido.
 */
export function featuresOf(planCode: string): readonly PlanFeature[] {
  return FEATURES_BY_PLAN[planCode] ?? PLAN_FEATURES;
}

/**
 * @param planCode - El plan del negocio.
 * @param feature - La función.
 */
export function planHasFeature(
  planCode: string,
  feature: PlanFeature,
): boolean {
  return featuresOf(planCode).includes(feature);
}
