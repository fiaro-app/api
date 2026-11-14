import type { AttachmentKind } from '@/modules/attachments/domain/attachment-kind.js';

/** Puerto de persistencia de las fotos privadas: solo guarda la llave del objeto en el bucket. */
export interface AttachmentRepository {
  /**
   * @param kind - El tipo de foto.
   * @param ownerId - El cliente o el pago.
   * @returns La llave guardada, o `null` si no hay foto.
   */
  findKey(kind: AttachmentKind, ownerId: string): Promise<string | null>;

  /**
   * Guarda la foto de ese dueño; si ya tenía una, la reemplaza.
   *
   * @returns La llave anterior, o `null` si no había.
   */
  replace(input: {
    readonly id: string;
    readonly lenderId: string;
    readonly kind: AttachmentKind;
    readonly ownerId: string;
    readonly key: string;
  }): Promise<string | null>;

  /** @returns La llave que tenía, o `null` si no había foto. */
  remove(kind: AttachmentKind, ownerId: string): Promise<string | null>;
}
