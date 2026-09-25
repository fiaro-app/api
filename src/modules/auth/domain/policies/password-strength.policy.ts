import commonPasswords from '@/modules/auth/domain/policies/common-passwords.json' with { type: 'json' };
import {
  type PasswordWeakness,
  WeakPasswordError,
} from '@/modules/auth/domain/errors/weak-password.error.js';

/** Quién es el dueño de la contraseña: sus datos no pueden estar dentro de ella. */
export interface PasswordOwner {
  /** Celular en formato E.164 (`+573001234567`). */
  readonly phone?: string | null;
  /** Cédula de ciudadanía, en dígitos. */
  readonly nationalId?: string | null;
}

/** Las contraseñas más usadas, sin tildes ni mayúsculas (`common-passwords.json`). */
const COMMON = new Set<string>(commonPasswords);

/** Cuántos dígitos como máximo puede sumar al final una contraseña común («password1234»). */
const MAX_TAIL_DIGITS = 4;

/** El final que se le quita a una contraseña común: hasta cuatro dígitos y un símbolo, o solo el símbolo. */
const TAIL = new RegExp(
  `\\d{1,${String(MAX_TAIL_DIGITS)}}[!.*#]?$|[!.*#]$`,
  'u',
);

/** Un bloque de hasta cuatro caracteres que se repite todo el largo: `aaaaaaaa`, `12121212`. */
const REPEATED_BLOCK = /^(.{1,4})\1+$/u;

/** Los dígitos que tiene el texto, en el orden en que aparecen. */
const digitsOf = (value: string): string => value.replace(/\D/gu, '');

/** Sin tildes ni mayúsculas, para comparar con la lista. */
const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Cambia las letras que se suelen escribir como números o símbolos: `p@ssw0rd` es `password`. */
const unleet = (value: string): string =>
  value
    .replaceAll('0', 'o')
    .replaceAll('1', 'i')
    .replaceAll('3', 'e')
    .replaceAll('4', 'a')
    .replaceAll('5', 's')
    .replaceAll('7', 't')
    .replaceAll('@', 'a')
    .replaceAll('$', 's')
    .replaceAll('!', 'i');

/** Si el texto, o el texto sin su final de dígitos, está en la lista, escrito tal cual o en «leet». */
function isCommon(folded: string): boolean {
  const bases = [folded, folded.replace(TAIL, '')];
  return bases.some((base) => COMMON.has(base) || COMMON.has(unleet(base)));
}

/** Si cada carácter es el siguiente (o el anterior) al que lo precede: `12345678`, `abcdefgh`, `87654321`. */
function isRun(value: string, step: 1 | -1): boolean {
  let previous = value.charCodeAt(0);
  for (const char of value.slice(1)) {
    const code = char.charCodeAt(0);
    if (code - previous !== step) {
      return false;
    }
    previous = code;
  }
  return true;
}

/** Si la contraseña es un bloque repetido o una escalera de caracteres seguidos. */
function isPattern(folded: string): boolean {
  return (
    folded.length > 1 &&
    (REPEATED_BLOCK.test(folded) || isRun(folded, 1) || isRun(folded, -1))
  );
}

/** Si la contraseña lleva dentro el celular (sus 10 dígitos) o la cédula de su dueño, con o sin separadores. */
function includesOwnerData(password: string, owner: PasswordOwner): boolean {
  const digits = digitsOf(password);
  const secrets = [
    digitsOf(owner.phone ?? '').slice(-10),
    digitsOf(owner.nationalId ?? ''),
  ];
  return secrets.some(
    (secret) => secret.length >= 6 && digits.includes(secret),
  );
}

/**
 * Por qué una contraseña es demasiado fácil de adivinar, si lo es. No mira la longitud: eso lo
 * hace `assertPasswordAllowed`.
 *
 * @remarks
 * Tres reglas, sin exigir mayúsculas ni símbolos (una regla de composición hace contraseñas más
 * difíciles de recordar, no más difíciles de adivinar): no estar entre las más usadas (lista corta
 * y ampliable, con hasta cuatro dígitos al final y escrita en «leet»), no ser un bloque repetido
 * ni una escalera de caracteres seguidos, y no llevar dentro el celular ni la cédula de su dueño.
 *
 * @param password - Contraseña en claro.
 * @param owner - Su dueño, si se conoce.
 * @returns El motivo, o `undefined` si la contraseña pasa.
 */
export function findPasswordWeakness(
  password: string,
  owner: PasswordOwner = {},
): PasswordWeakness | undefined {
  const folded = fold(password);
  if (isCommon(folded)) {
    return 'COMMON';
  }
  if (isPattern(folded)) {
    return 'PATTERN';
  }
  return includesOwnerData(password, owner) ? 'PERSONAL' : undefined;
}

/**
 * Rechaza una contraseña demasiado fácil de adivinar.
 *
 * @param password - Contraseña en claro.
 * @param owner - Su dueño, si se conoce.
 * @throws {@link WeakPasswordError} Si {@link findPasswordWeakness} encuentra un motivo.
 */
export function assertPasswordStrong(
  password: string,
  owner: PasswordOwner = {},
): void {
  const weakness = findPasswordWeakness(password, owner);
  if (weakness !== undefined) {
    throw new WeakPasswordError(weakness);
  }
}
