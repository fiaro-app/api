import type { Response } from 'express';

/**
 * Marca una respuesta como traducida: dice en qué idioma salió (`Content-Language`) y que cambia
 * según `Accept-Language` (`Vary`), para que una caché no sirva el texto de un idioma a quien
 * pidió otro.
 *
 * @remarks
 * Solo las respuestas con texto para personas la llevan (los errores): el resto de las respuestas
 * es igual en todos los idiomas.
 *
 * @param res - Respuesta de Express.
 * @param language - Idioma en que se escribió el texto.
 */
export function markLocalized(res: Response, language: string): void {
  res.setHeader('Content-Language', language);
  res.vary('Accept-Language');
}
