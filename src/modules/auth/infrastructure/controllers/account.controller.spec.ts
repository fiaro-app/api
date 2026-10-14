import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import type { DeactivateAccountUseCase } from '@/modules/auth/application/use-cases/deactivate-account.use-case.js';
import type { ListAccountSessionsUseCase } from '@/modules/auth/application/use-cases/list-account-sessions.use-case.js';
import type { RevokeAccountSessionUseCase } from '@/modules/auth/application/use-cases/revoke-account-session.use-case.js';
import type { RequestContactEmailVerificationUseCase } from '@/modules/auth/application/use-cases/request-contact-email-verification.use-case.js';
import type { UpdateProfileUseCase } from '@/modules/auth/application/use-cases/update-profile.use-case.js';
import type { VerifyContactEmailUseCase } from '@/modules/auth/application/use-cases/verify-contact-email.use-case.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { AccountController } from '@/modules/auth/infrastructure/controllers/account.controller.js';
import type { ContactEmailVerificationGuard } from '@/modules/auth/infrastructure/contact-email-verification/contact-email-verification-guard.js';

const requestOf = () =>
  ({ headers: {}, ip: '203.0.113.7' }) as unknown as Request;

const USER: AuthenticatedUser = {
  id: 'user-1',
  phone: '+573001234567',
  fullName: 'Ana Pérez',
  mustChangePassword: false,
};

function setup() {
  const auditor = {
    contactEmailVerificationRequested: vi.fn(),
    contactEmailVerified: vi.fn(),
    profileUpdated: vi.fn(),
    accountDeactivated: vi.fn(),
  };
  const contactEmailVerificationGuard = {
    admitVerification: vi.fn(() => Promise.resolve()),
    forgiveVerification: vi.fn(() => Promise.resolve()),
  };
  const requestContactEmailVerificationUseCase = {
    execute: vi.fn(() => Promise.resolve()),
  };
  const verifyContactEmailUseCase = { execute: vi.fn(() => Promise.resolve()) };
  const updateProfileUseCase = {
    execute: vi.fn(() =>
      Promise.resolve({
        fullName: 'Ana Pérez Gómez',
        contactEmail: 'ana@example.com',
        contactEmailVerified: false,
      }),
    ),
  };
  const deactivateAccountUseCase = { execute: vi.fn(() => Promise.resolve()) };
  const controller = new AccountController(
    auditor as unknown as AuthAuditor,
    contactEmailVerificationGuard as unknown as ContactEmailVerificationGuard,
    requestContactEmailVerificationUseCase as unknown as RequestContactEmailVerificationUseCase,
    verifyContactEmailUseCase as unknown as VerifyContactEmailUseCase,
    updateProfileUseCase as unknown as UpdateProfileUseCase,
    deactivateAccountUseCase as unknown as DeactivateAccountUseCase,
    {} as ListAccountSessionsUseCase,
    {} as RevokeAccountSessionUseCase,
  );
  return {
    controller,
    auditor,
    contactEmailVerificationGuard,
    requestContactEmailVerificationUseCase,
    verifyContactEmailUseCase,
    updateProfileUseCase,
    deactivateAccountUseCase,
  };
}

describe('AccountController', () => {
  it('publica las rutas de verificar el correo de contacto, actualizar el perfil, desactivar la cuenta y las sesiones', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      AccountController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          AccountController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined
          ? []
          : [
              `${RequestMethod[method]} ${String(Reflect.getMetadata(PATH_METADATA, handler))}`,
            ];
      })
      .sort();

    expect(publishedRoutes).toEqual([
      'DELETE sessions/:id',
      'GET sessions',
      'PATCH profile',
      'POST contact-email/request-verification',
      'POST contact-email/verify',
      'POST deactivate',
    ]);
  });

  it('cuelga de /account', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AccountController)).toBe(
      'account',
    );
  });

  describe('requestContactEmailVerification', () => {
    it('ejecuta el caso de uso y audita quién lo pidió', async () => {
      const { controller, requestContactEmailVerificationUseCase, auditor } =
        setup();

      const response = await controller.requestContactEmailVerification(
        USER,
        requestOf(),
      );

      expect(
        requestContactEmailVerificationUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({ userId: USER.id });
      expect(
        auditor.contactEmailVerificationRequested,
      ).toHaveBeenCalledExactlyOnceWith(USER.id, {
        ip: '203.0.113.7',
        userAgent: undefined,
      });
      expect(response).toEqual({ status: true });
    });
  });

  describe('verifyContactEmail', () => {
    it('admite el canje, ejecuta el caso de uso, perdona los intentos y audita', async () => {
      const {
        controller,
        contactEmailVerificationGuard,
        verifyContactEmailUseCase,
        auditor,
      } = setup();

      const response = await controller.verifyContactEmail(
        { code: '048213' },
        USER,
        requestOf(),
      );

      expect(
        contactEmailVerificationGuard.admitVerification,
      ).toHaveBeenCalledExactlyOnceWith(USER.id);
      expect(verifyContactEmailUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        { userId: USER.id, code: '048213' },
      );
      expect(
        contactEmailVerificationGuard.forgiveVerification,
      ).toHaveBeenCalledExactlyOnceWith(USER.id);
      expect(auditor.contactEmailVerified).toHaveBeenCalledExactlyOnceWith(
        USER.id,
        { ip: '203.0.113.7', userAgent: undefined },
      );
      expect(response).toEqual({ status: true });
    });
  });

  describe('updateProfile', () => {
    it('ejecuta el caso de uso, audita qué campos vinieron en el pedido y devuelve el perfil', async () => {
      const { controller, updateProfileUseCase, auditor } = setup();

      const response = await controller.updateProfile(
        { fullName: 'Ana Pérez Gómez', contactEmail: 'ana@example.com' },
        USER,
        requestOf(),
      );

      expect(updateProfileUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        userId: USER.id,
        fullName: 'Ana Pérez Gómez',
        contactEmail: 'ana@example.com',
      });
      expect(auditor.profileUpdated).toHaveBeenCalledExactlyOnceWith(
        USER.id,
        { fullName: true, contactEmail: true },
        { ip: '203.0.113.7', userAgent: undefined },
      );
      expect(response).toEqual({
        fullName: 'Ana Pérez Gómez',
        contactEmail: 'ana@example.com',
        contactEmailVerified: false,
      });
    });

    it('con un solo campo, audita que el otro no vino', async () => {
      const { controller, auditor } = setup();

      await controller.updateProfile(
        { fullName: 'Ana Pérez Gómez' },
        USER,
        requestOf(),
      );

      expect(auditor.profileUpdated).toHaveBeenCalledExactlyOnceWith(
        USER.id,
        { fullName: true, contactEmail: false },
        expect.anything(),
      );
    });
  });

  describe('deactivateAccount', () => {
    it('ejecuta el caso de uso con la contraseña y audita', async () => {
      const { controller, deactivateAccountUseCase, auditor } = setup();

      const response = await controller.deactivateAccount(
        { password: 'una-contraseña-larga' },
        USER,
        requestOf(),
      );

      expect(deactivateAccountUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        userId: USER.id,
        password: 'una-contraseña-larga',
      });
      expect(auditor.accountDeactivated).toHaveBeenCalledExactlyOnceWith(
        USER.id,
        { ip: '203.0.113.7', userAgent: undefined },
      );
      expect(response).toEqual({ status: true });
    });
  });
});
