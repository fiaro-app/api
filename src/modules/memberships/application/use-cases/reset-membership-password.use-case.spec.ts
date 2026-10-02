import { describe, expect, it, vi } from 'vitest';
import type { AdminResetPasswordUseCase } from '@/modules/auth/application/use-cases/admin-reset-password.use-case.js';
import type { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import type { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { ResetMembershipPasswordUseCase } from '@/modules/memberships/application/use-cases/reset-membership-password.use-case.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';

const MEMBERSHIP_DETAILS = {
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'] as const,
  status: 'ACTIVE' as const,
  portfolioId: 'portfolio-1',
  createdAt: new Date('2026-09-30T00:00:00Z'),
  deactivatedAt: null,
};

function setup(
  user: {
    fullName: string;
    phone: string;
    contactEmail: string | null;
  } | null = {
    fullName: 'Luis Gómez',
    phone: '+573109998877',
    contactEmail: 'luis@example.com',
  },
) {
  const getMembershipExecute = vi.fn(() => Promise.resolve(MEMBERSHIP_DETAILS));
  const getMembership = {
    execute: getMembershipExecute,
  } as unknown as GetMembershipUseCase;

  const getUserByIdExecute = vi.fn(() => Promise.resolve(user));
  const getUserById = {
    execute: getUserByIdExecute,
  } as unknown as GetUserByIdUseCase;

  const adminResetPasswordExecute = vi.fn(() =>
    Promise.resolve('TempAbc23456'),
  );
  const adminResetPassword = {
    execute: adminResetPasswordExecute,
  } as unknown as AdminResetPasswordUseCase;

  const send = vi.fn();
  const emailSender: EmailSender = { send };

  return {
    useCase: new ResetMembershipPasswordUseCase(
      getMembership,
      getUserById,
      adminResetPassword,
      emailSender,
    ),
    getMembershipExecute,
    adminResetPasswordExecute,
    send,
  };
}

describe('ResetMembershipPasswordUseCase', () => {
  it('restablece la contraseña y avisa por correo si la persona tiene uno', async () => {
    const { useCase, adminResetPasswordExecute, send } = setup();

    const tempPassword = await useCase.execute('membership-1', 'lender-1');

    expect(tempPassword).toBe('TempAbc23456');
    expect(adminResetPasswordExecute).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: 'luis@example.com',
        subject: expect.any(String),
      }),
    );
  });

  it('restablece la contraseña sin avisar por correo si la persona no tiene uno', async () => {
    const { useCase, send } = setup({
      fullName: 'Luis Gómez',
      phone: '+573109998877',
      contactEmail: null,
    });

    const tempPassword = await useCase.execute('membership-1', 'lender-1');

    expect(tempPassword).toBe('TempAbc23456');
    expect(send).not.toHaveBeenCalled();
  });

  it('propaga el error si la membresía no existe, sin restablecer nada', async () => {
    const { useCase, getMembershipExecute, adminResetPasswordExecute } =
      setup();
    getMembershipExecute.mockRejectedValueOnce(
      new MembershipNotFoundError('membership-1'),
    );

    await expect(
      useCase.execute('membership-1', 'lender-1'),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
    expect(adminResetPasswordExecute).not.toHaveBeenCalled();
  });
});
