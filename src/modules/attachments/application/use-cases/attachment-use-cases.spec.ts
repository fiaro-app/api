import { describe, expect, it, vi } from 'vitest';
import type { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import { AttachImageUseCase } from '@/modules/attachments/application/use-cases/attach-image.use-case.js';
import { GetAttachmentUrlUseCase } from '@/modules/attachments/application/use-cases/get-attachment-url.use-case.js';
import { RemoveAttachmentUseCase } from '@/modules/attachments/application/use-cases/remove-attachment.use-case.js';
import { RequestAttachmentUploadUseCase } from '@/modules/attachments/application/use-cases/request-attachment-upload.use-case.js';
import { AttachmentForbiddenError } from '@/modules/attachments/domain/errors/attachment-forbidden.error.js';
import type { AttachmentRepository } from '@/modules/attachments/domain/repositories/attachment.repository.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';

const ID = '019dc2d6-0000-7000-8000-000000000001';
const TARGET = {
  kind: 'CLIENT_PHOTO' as const,
  ownerId: 'client-1',
  actor: { lenderId: 'lender-1', membershipId: 'm-1', roles: ['LENDER'] },
};
const KEY = `client-photos/lender-1/client-1/${ID}.jpg`;

function setup(options: { allowed?: boolean; previous?: string | null } = {}) {
  const assertAccess = vi.fn(() =>
    options.allowed === false
      ? Promise.reject(new AttachmentForbiddenError())
      : Promise.resolve(),
  );
  const owners = { assertAccess } as unknown as AttachmentOwners;
  const repo = {
    findKey: vi.fn(() => Promise.resolve(options.previous ?? null)),
    replace: vi.fn(() => Promise.resolve(options.previous ?? null)),
    remove: vi.fn(() => Promise.resolve(options.previous ?? null)),
  };
  const attachments = repo as unknown as AttachmentRepository;
  const bucket = {
    getPresignedUploadUrl: vi.fn(() =>
      Promise.resolve({
        uploadUrl: 'https://bucket/put',
        publicUrl: 'x',
        expiresAt: new Date('2026-10-16T00:05:00Z'),
      }),
    ),
    getPresignedDownloadUrl: vi.fn(() => Promise.resolve('https://bucket/get')),
    inspectObject: vi.fn(() =>
      Promise.resolve({
        sizeBytes: 10,
        contentType: 'image/jpeg',
        head: Uint8Array.from([0xff, 0xd8, 0xff]),
      }),
    ),
    deleteObject: vi.fn(() => Promise.resolve()),
  };
  const storage = bucket as unknown as ObjectStoragePort;
  return { owners, attachments, storage, assertAccess, repo, bucket };
}

describe('RequestAttachmentUploadUseCase', () => {
  it('firma una llave nueva dentro de la carpeta de ese dueño', async () => {
    const { owners, storage, bucket } = setup();
    const useCase = new RequestAttachmentUploadUseCase(owners, storage, {
      next: () => ID,
    });

    const upload = await useCase.execute({
      ...TARGET,
      contentType: 'image/jpeg',
      sizeBytes: 1000,
    });

    expect(upload).toEqual({
      uploadUrl: 'https://bucket/put',
      key: KEY,
      expiresAt: new Date('2026-10-16T00:05:00Z'),
    });
    expect(bucket.getPresignedUploadUrl).toHaveBeenCalledWith(KEY, {
      contentType: 'image/jpeg',
      sizeBytes: 1000,
    });
  });

  it('sin permiso no firma nada', async () => {
    const { owners, storage, bucket } = setup({ allowed: false });
    const useCase = new RequestAttachmentUploadUseCase(owners, storage, {
      next: () => ID,
    });

    await expect(
      useCase.execute({ ...TARGET, contentType: 'image/png', sizeBytes: 5 }),
    ).rejects.toBeInstanceOf(AttachmentForbiddenError);
    expect(bucket.getPresignedUploadUrl).not.toHaveBeenCalled();
  });
});

describe('AttachImageUseCase', () => {
  it('guarda la foto y borra la anterior del bucket', async () => {
    const { owners, attachments, storage, repo, bucket } = setup({
      previous: 'client-photos/lender-1/client-1/vieja.jpg',
    });
    const useCase = new AttachImageUseCase(owners, attachments, storage, {
      next: () => 'attachment-1',
    });

    await useCase.execute({ ...TARGET, key: KEY });

    expect(repo.replace).toHaveBeenCalledWith({
      id: 'attachment-1',
      lenderId: 'lender-1',
      kind: 'CLIENT_PHOTO',
      ownerId: 'client-1',
      key: KEY,
    });
    expect(bucket.deleteObject).toHaveBeenCalledWith(
      'client-photos/lender-1/client-1/vieja.jpg',
    );
  });

  it('la primera foto no borra nada, y volver a guardar la misma tampoco', async () => {
    const first = setup();
    await new AttachImageUseCase(
      first.owners,
      first.attachments,
      first.storage,
      { next: () => 'a' },
    ).execute({ ...TARGET, key: KEY });
    const same = setup({ previous: KEY });
    await new AttachImageUseCase(same.owners, same.attachments, same.storage, {
      next: () => 'a',
    }).execute({ ...TARGET, key: KEY });

    expect(first.bucket.deleteObject).not.toHaveBeenCalled();
    expect(same.bucket.deleteObject).not.toHaveBeenCalled();
  });

  it('con una llave de otro dueño no guarda nada', async () => {
    const { owners, attachments, storage, repo } = setup();
    const useCase = new AttachImageUseCase(owners, attachments, storage, {
      next: () => 'a',
    });

    await expect(
      useCase.execute({
        ...TARGET,
        key: `client-photos/lender-1/otro/${ID}.jpg`,
      }),
    ).rejects.toThrow();
    expect(repo.replace).not.toHaveBeenCalled();
  });
});

describe('GetAttachmentUrlUseCase', () => {
  const clock = { now: () => new Date('2026-10-16T00:00:00Z') };

  it('devuelve una URL firmada que vence en diez minutos', async () => {
    const { owners, attachments, storage, bucket } = setup({ previous: KEY });
    const useCase = new GetAttachmentUrlUseCase(
      owners,
      attachments,
      storage,
      clock,
    );

    expect(await useCase.execute(TARGET)).toEqual({
      url: 'https://bucket/get',
      expiresAt: new Date('2026-10-16T00:10:00Z'),
    });
    expect(bucket.getPresignedDownloadUrl).toHaveBeenCalledWith(KEY, 600);
  });

  it('sin foto devuelve null', async () => {
    const { owners, attachments, storage, bucket } = setup();
    const useCase = new GetAttachmentUrlUseCase(
      owners,
      attachments,
      storage,
      clock,
    );

    expect(await useCase.execute(TARGET)).toBeNull();
    expect(bucket.getPresignedDownloadUrl).not.toHaveBeenCalled();
  });
});

describe('RemoveAttachmentUseCase', () => {
  it('quita la foto y borra el archivo; sin foto no falla', async () => {
    const withPhoto = setup({ previous: KEY });
    await new RemoveAttachmentUseCase(
      withPhoto.owners,
      withPhoto.attachments,
      withPhoto.storage,
    ).execute(TARGET);
    const without = setup();
    await new RemoveAttachmentUseCase(
      without.owners,
      without.attachments,
      without.storage,
    ).execute(TARGET);

    expect(withPhoto.bucket.deleteObject).toHaveBeenCalledWith(KEY);
    expect(without.bucket.deleteObject).not.toHaveBeenCalled();
  });
});
