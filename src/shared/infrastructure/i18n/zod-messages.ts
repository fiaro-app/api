import { z } from 'zod';

type RawIssue = z.core.$ZodRawIssue;

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  'string',
  'number',
  'int',
  'boolean',
  'array',
  'object',
]);
const KNOWN_FORMATS: ReadonlySet<string> = new Set([
  'regex',
  'email',
  'uuid',
  'url',
  'date',
  'datetime',
]);
const PLAIN_CODES: ReadonlySet<string> = new Set([
  'invalid_value',
  'unrecognized_keys',
  'not_multiple_of',
  'invalid_union',
  'custom',
]);

function oneOf(value: unknown, known: ReadonlySet<string>): string {
  return typeof value === 'string' && known.has(value) ? value : 'other';
}

function sizeKind(origin: unknown): 'string' | 'array' | 'number' | 'other' {
  if (origin === 'string' || origin === 'array') {
    return origin;
  }
  return origin === 'number' || origin === 'int' || origin === 'bigint'
    ? 'number'
    : 'other';
}

/** `validation.too_small.string`, `validation.too_big.number_exclusive`... */
function sizeKey(issue: RawIssue): string {
  const kind = sizeKind(issue.origin);
  const exclusive = kind === 'number' && issue.inclusive === false;
  return `validation.${issue.code}.${kind}${exclusive ? '_exclusive' : ''}`;
}

/**
 * La clave del catálogo (`validation.*`) que corresponde a una falla de Zod: el código de la
 * falla y, cuando el texto cambia, el tipo, el formato o el origen del dato.
 *
 * @param issue - Falla de Zod tal como la produce el schema, antes de que tenga mensaje.
 */
export function messageKey(issue: RawIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return `validation.invalid_type.${issue.input === undefined ? 'missing' : oneOf(issue.expected, KNOWN_TYPES)}`;
    case 'too_small':
    case 'too_big':
      return sizeKey(issue);
    case 'invalid_format':
      return `validation.invalid_format.${oneOf(issue.format, KNOWN_FORMATS)}`;
    default:
      return PLAIN_CODES.has(issue.code)
        ? `validation.${issue.code}`
        : 'validation.invalid';
  }
}

/**
 * Hace que los mensajes por defecto de Zod sean claves del catálogo (`validation.too_small.string`)
 * en lugar de texto en inglés: así se traducen al idioma de cada petición cuando la respuesta sale.
 *
 * @remarks
 * La configuración de Zod es global del proceso, no de un schema ni de una petición. Un mensaje
 * que el propio schema escribe (`z.string().min(3, 'Muy corto')`) tiene prioridad y sale tal cual.
 */
export function configureZodMessages(): void {
  z.config({ localeError: messageKey });
}
