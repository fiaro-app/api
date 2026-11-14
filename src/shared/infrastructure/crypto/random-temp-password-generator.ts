import { randomInt } from 'node:crypto';
import type { TempPasswordGenerator } from '@/shared/application/ports/temp-password-generator.port.js';

/**
 * Sin `0/O/1/l/I`: se lee y se escribe a mano sin confundir caracteres al pasarla por WhatsApp
 * (PRODUCT.md §5).
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Caracteres de la contraseña temporal: de sobra para no caer en la lista de comunes ni en un patrón (D-65). */
const TEMP_PASSWORD_LENGTH = 16;

/** Genera contraseñas temporales al azar, con mezcla de mayúsculas, minúsculas y dígitos. */
export class RandomTempPasswordGenerator implements TempPasswordGenerator {
  /** @returns Una contraseña de {@link TEMP_PASSWORD_LENGTH} caracteres. */
  next(): string {
    let password = '';
    for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
      password += ALPHABET.charAt(randomInt(0, ALPHABET.length));
    }
    return password;
  }
}
