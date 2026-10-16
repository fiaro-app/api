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
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

const PaymentIdParamSchema = z.uuid();

/**
 * El comprobante de un pago (D-145): la captura de Nequi o de la transferencia que el cobrador adjunta a su cobro. Lo
 * sube, lo ve y lo quita quien administra o el cobrador que hizo ese cobro, nadie más. Nunca es público: se ve con una
 * URL firmada que vence en minutos.
 */
@ApiTags(API_TAGS.attachment.name)
@Controller('payments/:id/proof')
@UseGuards(LenderScopeGuard)
export class PaymentProofController {
  constructor(
    private readonly requestUpload: RequestAttachmentUploadUseCase,
    private readonly attach: AttachImageUseCase,
    private readonly getUrl: GetAttachmentUrlUseCase,
    private readonly remove: RemoveAttachmentUseCase,
  ) {}

  /**
   * @param id - El pago.
   * @param body - Tipo y peso del archivo, ya validados.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiAttachmentRoute('proof', 'upload-url')
  async uploadUrl(
    @Param('id', { schema: PaymentIdParamSchema }) id: string,
    @Body({ schema: AttachmentUploadRequestSchema })
    body: z.output<typeof AttachmentUploadRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof AttachmentUploadResponseSchema>> {
    const upload = await this.requestUpload.execute({
      ...targetOf('PAYMENT_PROOF', id, scope),
      ...body,
    });
    return { ...upload, expiresAt: upload.expiresAt.toISOString() };
  }

  /**
   * @param id - El pago.
   * @param body - La llave del archivo subido, ya validada.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAttachmentRoute('proof', 'attach')
  async save(
    @Param('id', { schema: PaymentIdParamSchema }) id: string,
    @Body({ schema: AttachImageRequestSchema })
    body: z.output<typeof AttachImageRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<void> {
    await this.attach.execute({
      ...targetOf('PAYMENT_PROOF', id, scope),
      key: body.key,
    });
  }

  /**
   * @param id - El pago.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiAttachmentRoute('proof', 'view')
  async view(
    @Param('id', { schema: PaymentIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof AttachmentViewResponseSchema>> {
    const view = await this.getUrl.execute(
      targetOf('PAYMENT_PROOF', id, scope),
    );
    return view === null
      ? { url: null, expiresAt: null }
      : { url: view.url, expiresAt: view.expiresAt.toISOString() };
  }

  /**
   * @param id - El pago.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAttachmentRoute('proof', 'remove')
  async delete(
    @Param('id', { schema: PaymentIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<void> {
    await this.remove.execute(targetOf('PAYMENT_PROOF', id, scope));
  }
}
