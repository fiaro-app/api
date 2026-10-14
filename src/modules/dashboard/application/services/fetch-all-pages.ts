/** Una página de resultados paginados, con el total sin paginar (misma forma en todo el repo). */
export interface Page<T> {
  readonly items: readonly T[];
  readonly total: number;
}

/**
 * Trae todas las páginas de un listado paginado: una primera página y, si `total` dice que falta
 * más, el resto en paralelo (mismo patrón de dos fases que el aviso diario de mora, D-96 — evita
 * pedir página por página en serie cuando ya se sabe cuántas hacen falta).
 *
 * @param pageSize - Tamaño de página a pedir; debe ser el mismo que usa `fetchPage`.
 * @param fetchPage - Pide una página, 1-indexada.
 */
export async function fetchAllPages<T>(
  pageSize: number,
  fetchPage: (page: number) => Promise<Page<T>>,
): Promise<T[]> {
  const first = await fetchPage(1);
  if (first.items.length >= first.total) {
    return [...first.items];
  }
  const remainingPages = Math.ceil(first.total / pageSize) - 1;
  const rest = await Promise.all(
    Array.from({ length: remainingPages }, (_, index) => fetchPage(index + 2)),
  );
  return [...first.items, ...rest.flatMap((page) => page.items)];
}
