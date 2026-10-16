import { describe, expect, it, vi } from 'vitest';
import type { AttachImageUseCase } from '@/modules/attachments/application/use-cases/attach-image.use-case.js';
import type { GetAttachmentUrlUseCase } from '@/modules/attachments/application/use-cases/get-attachment-url.use-case.js';
import type { RemoveAttachmentUseCase } from '@/modules/attachments/application/use-cases/remove-attachment.use-case.js';
import type { RequestAttachmentUploadUseCase } from '@/modules/attachments/application/use-cases/request-attachment-upload.use-case.js';
import { ClientPhotoController } from '@/modules/attachments/infrastructure/controllers/client-photo.controller.js';
import { PaymentProofController } from '@/modules/attachments/infrastructure/controllers/payment-proof.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const SCOPE = {
  lenderId: 'l1',
  membershipId: 'm1',
  roles: ['LENDER'],
} as unknown as LenderScope;
const EXPIRES = new Date('2026-10-16T12:00:00Z');

function setup(viewResult: { url: string; expiresAt: Date } | null) {
  const requestUpload = {
    execute: vi.fn(() =>
      Promise.resolve({
        uploadUrl: 'https://s/put',
        key: 'k',
        expiresAt: EXPIRES,
      }),
    ),
  };
  const attach = { execute: vi.fn(() => Promise.resolve()) };
  const getUrl = { execute: vi.fn(() => Promise.resolve(viewResult)) };
  const remove = { execute: vi.fn(() => Promise.resolve()) };
  const args = [
    requestUpload as unknown as RequestAttachmentUploadUseCase,
    attach as unknown as AttachImageUseCase,
    getUrl as unknown as GetAttachmentUrlUseCase,
    remove as unknown as RemoveAttachmentUseCase,
  ] as const;
  return { args, requestUpload, attach, getUrl, remove };
}

describe.each([
  ['ClientPhotoController', ClientPhotoController, 'CLIENT_PHOTO'],
  ['PaymentProofController', PaymentProofController, 'PAYMENT_PROOF'],
] as const)('%s', (_name, Controller, kind) => {
  it('pide la URL firmada de subida del dueño y devuelve la fecha en ISO', async () => {
    const { args, requestUpload } = setup(null);

    const response = await new Controller(...args).uploadUrl(
      'o1',
      { contentType: 'image/png', sizeBytes: 10 },
      SCOPE,
    );

    expect(requestUpload.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        kind,
        ownerId: 'o1',
        contentType: 'image/png',
        sizeBytes: 10,
      }),
    );
    expect(response).toEqual({
      uploadUrl: 'https://s/put',
      key: 'k',
      expiresAt: EXPIRES.toISOString(),
    });
  });

  it('guarda la llave subida', async () => {
    const { args, attach } = setup(null);

    await new Controller(...args).save('o1', { key: 'k' }, SCOPE);

    expect(attach.execute).toHaveBeenCalledWith(
      expect.objectContaining({ kind, ownerId: 'o1', key: 'k' }),
    );
  });

  it('muestra la URL firmada, o null si no hay imagen', async () => {
    const withImage = setup({ url: 'https://s/get', expiresAt: EXPIRES });
    expect(await new Controller(...withImage.args).view('o1', SCOPE)).toEqual({
      url: 'https://s/get',
      expiresAt: EXPIRES.toISOString(),
    });

    const without = setup(null);
    expect(await new Controller(...without.args).view('o1', SCOPE)).toEqual({
      url: null,
      expiresAt: null,
    });
  });

  it('quita la imagen', async () => {
    const { args, remove } = setup(null);

    await new Controller(...args).delete('o1', SCOPE);

    expect(remove.execute).toHaveBeenCalledWith(
      expect.objectContaining({ kind, ownerId: 'o1' }),
    );
  });
});
