import { Inject, Injectable } from '@nestjs/common';
import { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import type {
  AttachmentUpload,
  RequestAttachmentUploadInput,
} from '@/modules/attachments/application/dtos/attachment.dto.js';
import { attachmentPrefix } from '@/modules/attachments/domain/attachment-kind.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';
import { OBJECT_STORAGE } from '@/shared/application/ports/object-storage.token.js';
import { IMAGE_EXTENSION } from '@/shared/domain/images/image-policy.js';

/**
 * Una URL firmada para subir la foto de un cliente o el comprobante de un pago (D-145): el archivo va directo del
 * dispositivo al bucket, nunca por la API, y la URL firma el tipo y el peso exactos. Después se guarda con la llave
 * que devuelve esta misma respuesta. La llave es nueva en cada llamada: una foto vieja nunca se sobrescribe.
 */
@Injectable()
export class RequestAttachmentUploadUseCase {
  constructor(
    private readonly owners: AttachmentOwners,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  /**
   * @param input - La foto, quién la pide y el tipo y peso del archivo.
   * @throws {@link AttachmentForbiddenError} Si no tiene permiso sobre ese dueño.
   */
  async execute(
    input: RequestAttachmentUploadInput,
  ): Promise<AttachmentUpload> {
    await this.owners.assertAccess(input, true);
    const prefix = attachmentPrefix(
      input.kind,
      input.actor.lenderId,
      input.ownerId,
    );
    const key = `${prefix}/${this.ids.next()}.${IMAGE_EXTENSION[input.contentType]}`;
    const upload = await this.storage.getPresignedUploadUrl(key, {
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });
    return { uploadUrl: upload.uploadUrl, key, expiresAt: upload.expiresAt };
  }
}
