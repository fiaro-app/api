import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AttachImageUseCase } from '@/modules/attachments/application/use-cases/attach-image.use-case.js';
import { GetAttachmentUrlUseCase } from '@/modules/attachments/application/use-cases/get-attachment-url.use-case.js';
import { RemoveAttachmentUseCase } from '@/modules/attachments/application/use-cases/remove-attachment.use-case.js';
import { RequestAttachmentUploadUseCase } from '@/modules/attachments/application/use-cases/request-attachment-upload.use-case.js';
import { targetOf } from '@/modules/attachments/infrastructure/controllers/attachment-routes.js';
import { ApiAttachmentRoute } from '@/modules/attachments/infrastructure/controllers/docs/attachment-routes.docs.js';
import {
  AttachImageRequestSchema,
  AttachmentUploadRequestSchema,
  type AttachmentUploadResponseSchema,
  type AttachmentViewResponseSchema,
} from '@/modules/attachments/infrastructure/controllers/schemas/attachment.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { RestrictCollectorTo } from '@/shared/infrastructure/http/restrict-collector.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

const ClientIdParamSchema = z.uuid();

/**
 * La foto de un cliente (D-145). Quien administra la sube, la cambia y la quita; verla la puede quien puede ver al
 * cliente (un cobrador solo si tiene o tuvo un préstamo suyo, `RestrictCollectorTo`). Nunca es pública: se ve con una URL
 * firmada que vence en minutos.
 */
@ApiTags(API_TAGS.attachment.name)
@Controller('clients/:id/photo')
@UseGuards(LenderScopeGuard)
export class ClientPhotoController {
  constructor(
    private readonly requestUpload: RequestAttachmentUploadUseCase,
    private readonly attach: AttachImageUseCase,
    private readonly getUrl: GetAttachmentUrlUseCase,
    private readonly remove: RemoveAttachmentUseCase,
  ) {}

  /**
   * @param id - El cliente.
   * @param body - Tipo y peso del archivo, ya validados.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiAttachmentRoute('photo', 'upload-url')
  async uploadUrl(
    @Param('id', { schema: ClientIdParamSchema }) id: string,
    @Body({ schema: AttachmentUploadRequestSchema })
    body: z.output<typeof AttachmentUploadRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof AttachmentUploadResponseSchema>> {
    const upload = await this.requestUpload.execute({
      ...targetOf('CLIENT_PHOTO', id, scope),
      ...body,
    });
    return { ...upload, expiresAt: upload.expiresAt.toISOString() };
  }

  /**
   * @param id - El cliente.
   * @param body - La llave del archivo subido, ya validada.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAttachmentRoute('photo', 'attach')
  async save(
    @Param('id', { schema: ClientIdParamSchema }) id: string,
    @Body({ schema: AttachImageRequestSchema })
    body: z.output<typeof AttachImageRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<void> {
    await this.attach.execute({
      ...targetOf('CLIENT_PHOTO', id, scope),
      key: body.key,
    });
  }

  /**
   * @param id - El cliente.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Get()
  @RestrictCollectorTo('client')
  @HttpCode(HttpStatus.OK)
  @ApiAttachmentRoute('photo', 'view')
  async view(
    @Param('id', { schema: ClientIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof AttachmentViewResponseSchema>> {
    const view = await this.getUrl.execute(targetOf('CLIENT_PHOTO', id, scope));
    return view === null
      ? { url: null, expiresAt: null }
      : { url: view.url, expiresAt: view.expiresAt.toISOString() };
  }

  /**
   * @param id - El cliente.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAttachmentRoute('photo', 'remove')
  async delete(
    @Param('id', { schema: ClientIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<void> {
    await this.remove.execute(targetOf('CLIENT_PHOTO', id, scope));
  }
}
