/** Un idioma pedido en `Accept-Language`, con su peso (`q`) y el lugar que ocupa en la cabecera. */
interface RequestedLanguage {
  readonly tag: string;
  readonly weight: number;
  readonly position: number;
}

/** El comodín de `Accept-Language`: «cualquier idioma». */
const ANY_LANGUAGE = '*';

/** El peso de un idioma (`q=0.8`). Sin `q` vale 1; un valor que no es un número de 0 a 1 se ignora. */
function weightOf(params: readonly string[]): number {
  const quality = params.find((param) => param.toLowerCase().startsWith('q='));
  if (quality === undefined) {
    return 1;
  }
  const weight = Number(quality.slice(2));
  return weight >= 0 && weight <= 1 ? weight : 0;
}

function parse(header: string): RequestedLanguage[] {
  return header.split(',').flatMap((entry, position) => {
    const [tag = '', ...params] = entry.split(';').map((part) => part.trim());
    return tag === ''
      ? []
      : [{ tag: tag.toLowerCase(), weight: weightOf(params), position }];
  });
}

/** El idioma disponible que corresponde a la etiqueta pedida: `es-CO` sirve el catálogo `es`. */
function match<L extends string>(
  tag: string,
  supported: readonly L[],
): L | undefined {
  const [primary] = tag.split('-');
  return (
    supported.find((language) => language === tag) ??
    supported.find((language) => language === primary)
  );
}

/**
 * Elige el idioma de la respuesta según la cabecera `Accept-Language` (RFC 9110, sección 12.5.4).
 *
 * @remarks
 * Recorre los idiomas pedidos del más al menos preferido (mayor `q`; a igual `q`, el que aparece
 * primero) y devuelve el primero que la API habla. Una región sirve el idioma base (`es-CO` →
 * `es`). El comodín `*` acepta cualquier idioma, así que devuelve el de por defecto, y `q=0`
 * excluye un idioma. Sin cabecera o sin coincidencia responde el idioma de por defecto: pedir un
 * idioma que no existe no es un error.
 *
 * @param header - Valor de `Accept-Language`, si la petición lo trae.
 * @param supported - Idiomas que la API habla.
 * @param fallback - Idioma de por defecto.
 * @returns El idioma con el que se responde.
 */
export function negotiateLanguage<L extends string>(
  header: string | undefined,
  supported: readonly L[],
  fallback: L,
): L {
  if (header === undefined) {
    return fallback;
  }
  const requested = parse(header)
    .filter(({ weight }) => weight > 0)
    .sort((a, b) => b.weight - a.weight || a.position - b.position);
  for (const { tag } of requested) {
    if (tag === ANY_LANGUAGE) {
      return fallback;
    }
    const language = match(tag, supported);
    if (language !== undefined) {
      return language;
    }
  }
  return fallback;
}
