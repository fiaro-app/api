/** A qué pertenece una foto privada. */
export const ATTACHMENT_KINDS = ['CLIENT_PHOTO', 'PAYMENT_PROOF'] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/** Carpeta del bucket de cada tipo. */
export const ATTACHMENT_FOLDER: Record<AttachmentKind, string> = {
  CLIENT_PHOTO: 'client-photos',
  PAYMENT_PROOF: 'payment-proofs',
};

/** Cuánto sirve la URL firmada con la que se ve una foto: lo justo para que la pantalla la cargue. */
export const ATTACHMENT_URL_TTL_SECONDS = 600;

/**
 * @param kind - El tipo de foto.
 * @param lenderId - El prestamista dueño.
 * @param ownerId - El cliente o el pago.
 * @returns La «carpeta» de esa foto en el bucket: `client-photos/<prestamista>/<cliente>`. Las llaves nuevas son
 * `<carpeta>/<uuid>.<png|jpg>`, así una llave de otro dueño nunca pasa.
 */
export function attachmentPrefix(
  kind: AttachmentKind,
  lenderId: string,
  ownerId: string,
): string {
  return `${ATTACHMENT_FOLDER[kind]}/${lenderId}/${ownerId}`;
}
