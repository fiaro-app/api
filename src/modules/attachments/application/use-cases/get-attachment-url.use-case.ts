import { Inject, Injectable } from '@nestjs/common';
import { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import type {
  AttachmentTarget,
  AttachmentView,
} from '@/modules/attachments/application/dtos/attachment.dto.js';
import { ATTACHMENT_URL_TTL_SECONDS } from '@/modules/attachments/domain/attachment-kind.js';
import type { AttachmentRepository } from '@/modules/attachments/domain/repositories/attachment.repository.js';
import { ATTACHMENT_REPOSITORY } from '@/modules/attachments/domain/tokens/attachment-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';
import { OBJECT_STORAGE } from '@/shared/application/ports/object-storage.token.js';

/** La URL firmada con la que se ve una foto privada (vence en minutos), o `null` si ese dueño no tiene foto. */
@Injectable()
export class GetAttachmentUrlUseCase {
  constructor(
    private readonly owners: AttachmentOwners,
    @Inject(ATTACHMENT_REPOSITORY)
    private readonly attachments: AttachmentRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param target - La foto y quién la pide.
   * @throws {@link AttachmentForbiddenError} Si no tiene permiso sobre ese dueño.
   */
  async execute(target: AttachmentTarget): Promise<AttachmentView | null> {
    await this.owners.assertAccess(target, false);
    const key = await this.attachments.findKey(target.kind, target.ownerId);
    if (key === null) {
      return null;
    }
    return {
      url: await this.storage.getPresignedDownloadUrl(
        key,
        ATTACHMENT_URL_TTL_SECONDS,
      ),
      expiresAt: new Date(
        this.clock.now().getTime() + ATTACHMENT_URL_TTL_SECONDS * 1000,
      ),
    };
  }
}
