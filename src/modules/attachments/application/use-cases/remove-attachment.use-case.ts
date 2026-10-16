import { Inject, Injectable } from '@nestjs/common';
import { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import type { AttachmentTarget } from '@/modules/attachments/application/dtos/attachment.dto.js';
import type { AttachmentRepository } from '@/modules/attachments/domain/repositories/attachment.repository.js';
import { ATTACHMENT_REPOSITORY } from '@/modules/attachments/domain/tokens/attachment-repository.token.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';
import { OBJECT_STORAGE } from '@/shared/application/ports/object-storage.token.js';

/** Quita la foto de un dueño y borra el archivo del bucket. Repetirlo no falla. */
@Injectable()
export class RemoveAttachmentUseCase {
  constructor(
    private readonly owners: AttachmentOwners,
    @Inject(ATTACHMENT_REPOSITORY)
    private readonly attachments: AttachmentRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  /**
   * @param target - La foto y quién la quita.
   * @throws {@link AttachmentForbiddenError} Si no tiene permiso sobre ese dueño.
   */
  async execute(target: AttachmentTarget): Promise<void> {
    await this.owners.assertAccess(target, true);
    const key = await this.attachments.remove(target.kind, target.ownerId);
    if (key !== null) {
      await this.storage.deleteObject(key);
    }
  }
}
