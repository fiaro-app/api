import { createHmac, hkdfSync } from 'node:crypto';
import type { MaskedValue } from '@/shared/domain/audit/audit-event.js';

/** Contexto con el que se deriva la clave de las huellas, aparte de la que usa better-auth. */
const KEY_CONTEXT = 'fiaro-audit-masking-v1';

/** Largo de la huella: 32 caracteres hexadecimales son 128 bits, de sobra para no repetirse. */
const HASH_LENGTH = 32;

/**
 * Enmascara los datos personales antes de que lleguen a la auditoría: deja los últimos 4
 * caracteres y una huella con clave (HMAC-SHA256).
 *
 * @remarks
 * La huella lleva clave porque un celular colombiano tiene solo mil millones de posibilidades:
 * un hash simple se revertiría probándolas todas. La clave se deriva del secreto de la
 * aplicación con HKDF, así que sin él la huella no se puede recalcular. Cambiar el secreto cambia
 * todas las huellas: los eventos anteriores dejan de poder unirse con los nuevos.
 */
export class PersonalDataMasker {
  private readonly key: Buffer;

  /** @param secret - Secreto de la aplicación, del que se deriva la clave de las huellas. */
  constructor(secret: string) {
    this.key = Buffer.from(hkdfSync('sha256', secret, '', KEY_CONTEXT, 32));
  }

  /**
   * @param value - El dato personal completo, por ejemplo `+573001234567`.
   * @returns Sus últimos 4 caracteres y su huella.
   */
  mask(value: string): MaskedValue {
    return {
      last4: value.slice(-4),
      hash: createHmac('sha256', this.key)
        .update(value)
        .digest('hex')
        .slice(0, HASH_LENGTH),
    };
  }
}
