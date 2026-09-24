/** Dominio reservado (RFC 2606) que nunca resuelve: a esta dirección no llega ningún correo. */
const TECHNICAL_EMAIL_DOMAIN = 'phone.fiaro.invalid';

/**
 * Dirección que better-auth exige en cada usuario (única y obligatoria) aunque en Fiaro se inicia
 * sesión con el celular y el email es opcional (D-07). Se deriva del celular, así que dos
 * cuentas nunca la comparten, y no es un buzón real: el email de la persona es `contactEmail`.
 *
 * @param phone - Celular en formato E.164.
 * @returns La dirección técnica de ese celular.
 */
export function technicalEmailFor(phone: string): string {
  return `${phone.replace(/^\+/, '')}@${TECHNICAL_EMAIL_DOMAIN}`;
}
