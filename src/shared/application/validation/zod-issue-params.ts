/** Campos de una falla de Zod que llenan marcadores de los textos de `validation` (`{minimum}`). */
const PARAM_NAMES = [
  'minimum',
  'maximum',
  'divisor',
  'keys',
  'values',
] as const;

function display(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(display).join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' || typeof value === 'bigint'
    ? String(value)
    : JSON.stringify(value);
}

/**
 * Los valores con los que se llenan los marcadores del texto de una falla de Zod (`{minimum}`,
 * `{keys}`...), tomados de los campos de la propia falla. Es una función pura: no importa Zod,
 * así que la usan tanto el pipe de validación como los casos de uso que validan con el contrato.
 *
 * @param issue - Falla de Zod ya con mensaje, como la devuelve un schema al validar.
 * @returns Un valor por cada campo que la falla trae; vacío si no trae ninguno.
 */
export function zodIssueParams(
  issue: object,
): Readonly<Record<string, string>> {
  const fields = issue as Readonly<Record<string, unknown>>;
  const params: Record<string, string> = {};
  for (const name of PARAM_NAMES) {
    if (fields[name] !== undefined) {
      params[name] = display(fields[name]);
    }
  }
  return params;
}

/**
 * La ruta de un error de Zod como la lleva `VALIDATION_FAILED`: los símbolos (claves de objetos)
 * no viajan en JSON, así que pasan a texto.
 *
 * @param path - Ruta del error hasta el campo, tal como la entrega Zod.
 */
export const toIssuePath = (
  path: readonly PropertyKey[],
): (string | number)[] =>
  path.map((segment) =>
    typeof segment === 'symbol' ? segment.toString() : segment,
  );
