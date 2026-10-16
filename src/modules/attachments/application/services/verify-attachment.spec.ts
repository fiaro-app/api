import { describe, expect, it, vi } from 'vitest';
import { verifyAttachment } from '@/modules/attachments/application/services/verify-attachment.js';
import { InvalidAttachmentError } from '@/modules/attachments/domain/errors/invalid-attachment.error.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';

const PREFIX = 'client-photos/lender-1/client-1';
const KEY = `${PREFIX}/019dc2d6-0000-7000-8000-000000000001.jpg`;
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);

function storage(info: unknown) {
  const deleteObject = vi.fn(() => Promise.resolve());
  const port = {
    inspectObject: vi.fn(() => Promise.resolve(info)),
    deleteObject,
  } as unknown as ObjectStoragePort;
  return { port, deleteObject };
}

describe('verifyAttachment', () => {
  it('acepta un JPEG subido con la llave de este dueño', async () => {
    const { port } = storage({
      sizeBytes: 1000,
      contentType: 'image/jpeg',
      head: JPEG,
    });

    await expect(verifyAttachment(port, PREFIX, KEY)).resolves.toBeUndefined();
  });

  it('rechaza una llave de otro dueño sin tocar el bucket', async () => {
    const { port } = storage(null);

    await expect(
      verifyAttachment(port, PREFIX, 'client-photos/lender-1/otro/x.jpg'),
    ).rejects.toBeInstanceOf(InvalidAttachmentError);
  });

  it('rechaza lo que todavía no se ha subido', async () => {
    const { port } = storage(null);

    await expect(verifyAttachment(port, PREFIX, KEY)).rejects.toThrow(
      'todavía no se ha subido',
    );
  });

  it.each([
    ['vacío', { sizeBytes: 0, contentType: 'image/jpeg', head: JPEG }],
    [
      'de más de 5 MB',
      { sizeBytes: 6 * 1024 * 1024, contentType: 'image/jpeg', head: JPEG },
    ],
    [
      'que no es una imagen',
      {
        sizeBytes: 100,
        contentType: 'image/jpeg',
        head: new TextEncoder().encode('<svg'),
      },
    ],
    [
      'con otro Content-Type',
      { sizeBytes: 100, contentType: 'image/png', head: JPEG },
    ],
  ])('rechaza y borra un archivo %s', async (_name, info) => {
    const { port, deleteObject } = storage(info);

    await expect(verifyAttachment(port, PREFIX, KEY)).rejects.toBeInstanceOf(
      InvalidAttachmentError,
    );
    expect(deleteObject).toHaveBeenCalledWith(KEY);
  });
});
