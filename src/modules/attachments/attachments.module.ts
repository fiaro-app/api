import { Module } from '@nestjs/common';
import { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import { AttachImageUseCase } from '@/modules/attachments/application/use-cases/attach-image.use-case.js';
import { GetAttachmentUrlUseCase } from '@/modules/attachments/application/use-cases/get-attachment-url.use-case.js';
import { RemoveAttachmentUseCase } from '@/modules/attachments/application/use-cases/remove-attachment.use-case.js';
import { RequestAttachmentUploadUseCase } from '@/modules/attachments/application/use-cases/request-attachment-upload.use-case.js';
import { ATTACHMENT_REPOSITORY } from '@/modules/attachments/domain/tokens/attachment-repository.token.js';
import { ClientPhotoController } from '@/modules/attachments/infrastructure/controllers/client-photo.controller.js';
import { PaymentProofController } from '@/modules/attachments/infrastructure/controllers/payment-proof.controller.js';
import { PrismaAttachmentRepository } from '@/modules/attachments/infrastructure/persistence/prisma-attachment.repository.js';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Fotos privadas (D-145): la foto de un cliente y el comprobante de un pago. Compone, por la capa de aplicación,
 * `clients` y `collections` (para saber que el dueño existe y, en un pago, qué cobrador lo hizo) y `memberships`
 * (`LENDER_SCOPE_RESOLVER`). El bucket (`OBJECT_STORAGE`) es global.
 */
@Module({
  imports: [
    PersistenceModule,
    ClientsModule,
    CollectionsModule,
    MembershipsModule,
  ],
  controllers: [ClientPhotoController, PaymentProofController],
  providers: [
    { provide: ATTACHMENT_REPOSITORY, useClass: PrismaAttachmentRepository },
    AttachmentOwners,
    RequestAttachmentUploadUseCase,
    AttachImageUseCase,
    GetAttachmentUrlUseCase,
    RemoveAttachmentUseCase,
  ],
})
export class AttachmentsModule {}
