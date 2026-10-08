import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import type { PresignedUpload } from '@/shared/application/ports/object-storage.port.js';
import type { GetLenderLogoUploadUrlUseCase } from '@/modules/lenders/application/use-cases/get-lender-logo-upload-url.use-case.js';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { UpdateLenderUseCase } from '@/modules/lenders/application/use-cases/update-lender.use-case.js';
import { LenderController } from '@/modules/lenders/infrastructure/controllers/lender.controller.js';

const DETAILS = {
  id: 'lender-1',
  tenantId: 'tenant-1',
  name: 'Préstamos Ana',
  logoUrl: null,
  nonWorkingWeekdays: ['SUNDAY'] as const,
  skipNationalHolidays: false,
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

const UPLOAD: PresignedUpload = {
  uploadUrl: 'https://bucket.example/signed',
  publicUrl: 'https://assets.example/logos/lender-1/id-1.png',
  expiresAt: new Date('2026-10-07T15:05:00Z'),
};

function setup() {
  const getLenderUseCase = { execute: vi.fn(() => Promise.resolve(DETAILS)) };
  const updateLenderUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const getLenderLogoUploadUrlUseCase = {
    execute: vi.fn(() => Promise.resolve(UPLOAD)),
  };
  const controller = new LenderController(
    getLenderUseCase as unknown as GetLenderUseCase,
    updateLenderUseCase as unknown as UpdateLenderUseCase,
    getLenderLogoUploadUrlUseCase as unknown as GetLenderLogoUploadUrlUseCase,
  );
  return {
    controller,
    getLenderUseCase,
    updateLenderUseCase,
    getLenderLogoUploadUrlUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('LenderController', () => {
  it('publica GET, PATCH y POST logo-upload-url (cuelga de /lender)', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      LenderController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(LenderController.prototype, name) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['GET', 'PATCH', 'POST']);
    expect(Reflect.getMetadata(PATH_METADATA, LenderController)).toBe('lender');
  });

  describe('getLender', () => {
    it('devuelve la configuración del prestamista de la sesión, para cualquier rol', async () => {
      const { controller, getLenderUseCase } = setup();

      const response = await controller.getLender(scopeWith(['COLLECTOR']));

      expect(getLenderUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        'lender-1',
      );
      expect(response.name).toBe('Préstamos Ana');
      expect(response.createdAt).toBe('2026-09-30T00:00:00.000Z');
    });
  });

  describe('updateLender', () => {
    it('con rol OWNER actualiza la configuración', async () => {
      const { controller, updateLenderUseCase } = setup();

      const response = await controller.updateLender(
        { name: 'Préstamos Ana Pérez' },
        scopeWith(['OWNER']),
      );

      expect(updateLenderUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        name: 'Préstamos Ana Pérez',
      });
      expect(response.name).toBe('Préstamos Ana');
    });

    it('con rol LENDER también actualiza', async () => {
      const { controller, updateLenderUseCase } = setup();

      await controller.updateLender(
        { skipNationalHolidays: true },
        scopeWith(['LENDER']),
      );

      expect(updateLenderUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, updateLenderUseCase } = setup();

      const error = await controller
        .updateLender({ name: 'x' }, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(updateLenderUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getLenderLogoUploadUrl', () => {
    it('con rol OWNER devuelve la URL firmada, pasando el contentType', async () => {
      const { controller, getLenderLogoUploadUrlUseCase } = setup();

      const response = await controller.getLenderLogoUploadUrl(
        { contentType: 'image/png' },
        scopeWith(['OWNER']),
      );

      expect(
        getLenderLogoUploadUrlUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        contentType: 'image/png',
      });
      expect(response).toEqual({
        uploadUrl: UPLOAD.uploadUrl,
        publicUrl: UPLOAD.publicUrl,
        expiresAt: UPLOAD.expiresAt.toISOString(),
      });
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, getLenderLogoUploadUrlUseCase } = setup();

      const error = await controller
        .getLenderLogoUploadUrl(
          { contentType: 'image/png' },
          scopeWith(['COLLECTOR']),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(getLenderLogoUploadUrlUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
