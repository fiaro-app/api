/**
 * Funciones del producto que dependen del plan (D-151), aparte de los topes numéricos (D-144):
 * - `ADVANCED_STATS`: el PDF de estadísticas, el comparativo con el período anterior y los reportes de
 *   riesgo de clientes, mora y desempeño por cobrador.
 * - `EXCEL_IMPORT`: importar clientes y préstamos desde una hoja de cálculo.
 * - `CONSOLIDATED_STATS`: las cifras de todos los negocios de la dueña juntas (D-155).
 * - `PRIORITY_SUPPORT`: el canal de soporte prioritario (D-155); el API solo lo declara, la app muestra el contacto.
 */
export const PLAN_FEATURES = [
  'ADVANCED_STATS',
  'EXCEL_IMPORT',
  'CONSOLIDATED_STATS',
  'PRIORITY_SUPPORT',
] as const;

/** Una función de {@link PLAN_FEATURES}. */
export type PlanFeature = (typeof PLAN_FEATURES)[number];

/** Lo que trae Pro: todo lo de un solo negocio; lo de varios negocios es de Team (D-155). */
const PRO_FEATURES: readonly PlanFeature[] = ['ADVANCED_STATS', 'EXCEL_IMPORT'];

/**
 * Qué funciones trae cada plan. La prueba (`TRIAL`) y Team las traen todas: la prueba es para probar el
 * producto completo antes de elegir. Individual no trae ninguna. Es código y no una columna de la suscripción
 * a propósito: una función nueva le llega al plan sin migrar a nadie.
 */
export const FEATURES_BY_PLAN: Readonly<
  Record<string, readonly PlanFeature[]>
> = {
  TRIAL: PLAN_FEATURES,
  INDIVIDUAL: [],
  PRO: PRO_FEATURES,
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
