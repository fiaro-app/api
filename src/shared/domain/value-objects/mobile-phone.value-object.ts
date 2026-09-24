import { InvalidMobilePhoneError } from '@/shared/domain/errors/invalid-mobile-phone.error.js';

const COLOMBIAN_MOBILE_E164 = /^\+573\d{9}$/;

/**
 * Celular colombiano en formato E.164 (`+573001234567`). Identifica a cada usuario al iniciar
 * sesión, por eso es único en todo el sistema (D-27).
 *
 * @remarks
 * Solo acepta el formato canónico: convertir lo que escribe una persona (`300 123 4567`) es
 * trabajo de la capa que recibe el dato, con `toColombianE164` de `@fiaro-app/contracts`.
 */
export class MobilePhone {
  private constructor(readonly value: string) {}

  /**
   * @param value - Celular en formato E.164, por ejemplo `+573001234567`.
   * @throws {@link InvalidMobilePhoneError} Si el valor no está en formato E.164 de un celular colombiano.
   */
  static parse(value: string): MobilePhone {
    if (!COLOMBIAN_MOBILE_E164.test(value)) {
      throw new InvalidMobilePhoneError();
    }
    return new MobilePhone(value);
  }
}
