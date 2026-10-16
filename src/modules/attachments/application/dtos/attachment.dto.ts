import type { AttachmentKind } from '@/modules/attachments/domain/attachment-kind.js';

/** Quién pide algo sobre una foto, resuelto por `LenderScopeGuard`. */
export interface AttachmentActor {
  readonly lenderId: string;
  readonly membershipId: string;
  readonly roles: readonly string[];
}

/** A qué foto se refiere una petición. */
export interface AttachmentTarget {
  readonly kind: AttachmentKind;
  /** El cliente o el pago. */
  readonly ownerId: string;
  readonly actor: AttachmentActor;
}

/** Datos para pedir la URL firmada de subida. */
export interface RequestAttachmentUploadInput extends AttachmentTarget {
  readonly contentType: 'image/png' | 'image/jpeg';
  readonly sizeBytes: number;
}

/** Datos para guardar una foto ya subida. */
export interface AttachImageInput extends AttachmentTarget {
  /** La llave del objeto que devolvió la URL firmada. */
  readonly key: string;
}

/** La URL firmada para subir, y la llave con la que después se guarda. */
export interface AttachmentUpload {
  readonly uploadUrl: string;
  readonly key: string;
  readonly expiresAt: Date;
}

/** La URL firmada con la que se ve una foto, y cuándo vence. */
export interface AttachmentView {
  readonly url: string;
  readonly expiresAt: Date;
}
