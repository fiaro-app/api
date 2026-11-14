import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageLenderLogoReader } from '@/modules/dashboard/infrastructure/storage/storage-lender-logo-reader.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(
  options: {
    key?: string | null;
    body?: Buffer;
    ok?: boolean;
    fail?: boolean;
  } = {},
) {
  const keyFromPublicUrl = vi.fn(
    () => ('key' in options ? options.key : 'logos/ana.png') ?? null,
  );
  const getPresignedDownloadUrl = vi.fn(() =>
    Promise.resolve('https://bucket.test/signed'),
  );
  const fetchMock = vi.fn(() =>
    options.fail === true
      ? Promise.reject(new Error('red caída'))
      : Promise.resolve({
          ok: options.ok ?? true,
          arrayBuffer: () =>
            Promise.resolve(new Uint8Array(options.body ?? PNG).buffer),
        }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const reader = new StorageLenderLogoReader({
    keyFromPublicUrl,
    getPresignedDownloadUrl,
  } as unknown as ObjectStoragePort);
  return { reader, keyFromPublicUrl, getPresignedDownloadUrl, fetchMock };
}

describe('StorageLenderLogoReader', () => {
  it('baja un PNG o un JPEG de nuestro bucket con una URL firmada', async () => {
    const png = setup();
    expect(await png.reader.read('https://cdn.test/logos/ana.png')).toEqual(
      PNG,
    );
    expect(png.getPresignedDownloadUrl).toHaveBeenCalledWith(
      'logos/ana.png',
      60,
    );

    expect(
      await setup({ body: JPEG }).reader.read('https://cdn.test/x.jpg'),
    ).toEqual(JPEG);
  });

  it('sin logo, o con una URL que no es de nuestro bucket, no baja nada (SSRF)', async () => {
    const none = setup();
    expect(await none.reader.read(null)).toBeNull();
    const foreign = setup({ key: null });
    expect(
      await foreign.reader.read('http://169.254.169.254/latest/meta-data'),
    ).toBeNull();
    expect(foreign.fetchMock).not.toHaveBeenCalled();
  });

  it('un archivo que no es PNG ni JPEG, o un error del bucket, da null', async () => {
    expect(
      await setup({ body: Buffer.from('<svg></svg>') }).reader.read('u'),
    ).toBeNull();
    expect(await setup({ ok: false }).reader.read('u')).toBeNull();
  });

  it('un archivo demasiado grande da null', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);

    expect(await setup({ body: big }).reader.read('u')).toBeNull();
  });

  it('si la red falla lo registra y no lanza: el reporte se descarga sin logo', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    expect(await setup({ fail: true }).reader.read('u')).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });
});
