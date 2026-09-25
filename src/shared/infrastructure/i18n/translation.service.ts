import { DEFAULT_LANGUAGE } from '@/i18n/index.js';
import { currentLanguage } from '@/shared/infrastructure/i18n/language-context.js';
import {
  type FlatCatalogs,
  interpolate,
  type MessageKey,
  type MessageParams,
} from '@/shared/infrastructure/i18n/message-catalog.js';

/**
 * Traduce las claves del catálogo al idioma de la petición en curso (`Accept-Language`).
 *
 * @remarks
 * Si el idioma pedido no tiene la clave, usa el idioma de por defecto: un texto sin traducir se
 * lee en español en lugar de salir como una clave. Fuera de una petición (el arranque, un
 * script) el idioma es el de por defecto.
 */
export class TranslationService {
  /** @param catalogs - Los textos de cada idioma, con las claves aplanadas. */
  constructor(private readonly catalogs: FlatCatalogs) {}

  /** El idioma en que se responde ahora: el de la petición si tiene catálogo; si no, el de por defecto. */
  get language(): string {
    const requested = currentLanguage();
    return Object.hasOwn(this.catalogs, requested)
      ? requested
      : DEFAULT_LANGUAGE;
  }

  /**
   * El texto de una clave conocida al compilar.
   *
   * @param key - Clave del catálogo, por ejemplo `errors.NOT_FOUND`.
   * @param params - Valores de los marcadores del texto.
   * @returns El texto en el idioma de la petición.
   */
  translate(key: MessageKey, params?: MessageParams): string {
    return this.find(key, params) ?? key;
  }

  /**
   * El texto de una clave que solo se conoce al ejecutar, por ejemplo el código de un error, o
   * que puede no ser una clave (un mensaje ya escrito).
   *
   * @param key - Clave del catálogo, o cualquier texto.
   * @param params - Valores de los marcadores del texto.
   * @returns El texto en el idioma de la petición, o `undefined` si ningún idioma tiene la clave.
   */
  find(key: string, params?: MessageParams): string | undefined {
    const text =
      this.lookup(this.language, key) ?? this.lookup(DEFAULT_LANGUAGE, key);
    return text === undefined ? undefined : interpolate(text, params);
  }

  /** Busca solo entre las claves propias del catálogo: un texto como `constructor` no es una clave. */
  private lookup(language: string, key: string): string | undefined {
    const catalog = this.catalogs[language];
    return catalog !== undefined && Object.hasOwn(catalog, key)
      ? catalog[key]
      : undefined;
  }
}
