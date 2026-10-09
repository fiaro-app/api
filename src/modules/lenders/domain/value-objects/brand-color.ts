/** Un color en hexadecimal de seis dígitos con almohadilla: `#RRGGBB`. */
const BRAND_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * @param value - El texto a revisar.
 * @returns Si es un color `#RRGGBB` válido, en mayúsculas o minúsculas.
 */
export function isBrandColor(value: string): boolean {
  return BRAND_COLOR_PATTERN.test(value);
}

/**
 * Deja el color en su forma canónica (`#RRGGBB` en mayúsculas), para que `#ff8800` y `#FF8800`
 * se guarden y se comparen igual.
 *
 * @param value - Un color que ya cumple {@link isBrandColor}.
 */
export function normalizeBrandColor(value: string): string {
  return value.toUpperCase();
}
