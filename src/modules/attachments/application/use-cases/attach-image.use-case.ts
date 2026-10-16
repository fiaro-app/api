import { Inject, Injectable } from '@nestjs/common';
import { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import { verifyAttachment } from '@/modules/attachments/application/services/verify-attachment.js';
import type { AttachImageInput } from '@/modules/attachments/application/dtos/attachment.dto.js';
import { attachmentPrefix } from '@/modules/attachments/domain/attachment-kind.js';
import type { AttachmentRepository } from '@/modules/attachments/domain/repositories/attachment.repository.js';
import { ATTACHMENT_REPOSITORY } from '@/modules/attachments/domain/tokens/attachment-repository.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';
import { OBJECT_STORAGE } from '@/shared/application/ports/object-storage.token.js';

/**
 * Guarda la foto que ya se subió con la URL firmada (D-145), reemplazando la anterior del mismo dueño, que se borra del
 * bucket.
 */
@Injectable()
export class AttachImageUseCase {
  constructor(
    private readonly owners: AttachmentOwners,
    @Inject(ATTACHMENT_REPOSITORY)
    private readonly attachments: AttachmentRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  /**
   * @param input - La foto, quién la guarda y la llave subida.
   * @throws {@link AttachmentForbiddenError} Si no tiene permiso sobre ese dueño.
   * @throws {@link InvalidAttachmentError} Si la llave no es de este dueño o el archivo no es una foto válida.
   */
  async execute(input: AttachImageInput): Promise<void> {
    await this.owners.assertAccess(input, true);
    await verifyAttachment(
      this.storage,
      attachmentPrefix(input.kind, input.actor.lenderId, input.ownerId),
      input.key,
    );
    const previous = await this.attachments.replace({
      id: this.ids.next(),
      lenderId: input.actor.lenderId,
      kind: input.kind,
      ownerId: input.ownerId,
      key: input.key,
    });
    if (previous !== null && previous !== input.key) {
      await this.storage.deleteObject(previous);
    }
  }
}
