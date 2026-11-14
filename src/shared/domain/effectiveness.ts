/**
 * Efectividad de cobro: lo cobrado frente a lo esperado, de 0 a 1 (0 % a 100 %). Cobrar de más (atrasos
 * que se ponen al día, adelantos) no la pasa de 1: la efectividad mide cuánto de lo que tocaba cobrar se
 * cobró, no cuánto dinero entró.
 *
 * @param collectedAmount - Lo cobrado en el período.
 * @param expectedAmount - Lo que tocaba cobrar en el período.
 * @returns La efectividad entre 0 y 1, o `null` si no había nada esperado.
 */
export function effectivenessOf(
  collectedAmount: number,
  expectedAmount: number,
): number | null {
  if (expectedAmount === 0) {
    return null;
  }
  return Math.min(1, Math.max(0, collectedAmount / expectedAmount));
}
