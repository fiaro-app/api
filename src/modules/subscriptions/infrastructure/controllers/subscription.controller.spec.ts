import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env.js';
import type { SubscriptionDetails } from '@/modules/subscriptions/application/dtos/subscription-details.dto.js';
import type { GetSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/get-subscription.use-case.js';
import { SubscriptionController } from '@/modules/subscriptions/infrastructure/controllers/subscription.controller.js';
import { SubscriptionResponseSchema } from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS: SubscriptionDetails = {
  planCode: 'TRIAL',
  status: 'GRACE_PERIOD',
  currentPeriodEndsAt: new Date('2026-10-08T12:00:00Z'),
  graceEndsAt: new Date('2026-10-15T12:00:00Z'),
  daysRemaining: 0,
  graceDaysRemaining: 6,
  isReadOnly: false,
  features: ['ADVANCED_STATS', 'EXCEL_IMPORT'],
  limits: {
    maxActiveLenders: 1,
    maxCollectors: 5,
    maxAdmins: 3,
    maxPortfolios: 4,
    maxActiveLoans: null,
  },
  usage: {
    activeLenders: 1,
    activeCollectors: 2,
    activeAdmins: 1,
    activeLoans: 4,
  },
  createdAt: new Date('2026-09-08T12:00:00Z'),
};

const SCOPE: LenderScope = {
  lenderId: 'lender-1',
  membershipId: 'membership-1',
  roles: ['OWNER'],
};

describe('SubscriptionController', () => {
  it('sirve GET /subscription', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubscriptionController)).toBe(
      'subscription',
    );
    const handler = Object.getOwnPropertyDescriptor(
      SubscriptionController.prototype,
      'get',
    )?.value as object;
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
  });

  it('devuelve la suscripción del prestamista de la sesión, con fechas ISO', async () => {
    const execute = vi.fn(() => Promise.resolve(DETAILS));
    const controller = new SubscriptionController(
      { execute } as unknown as GetSubscriptionUseCase,
      { subscription: {} } as Env,
    );

    const response = await controller.get(SCOPE);

    expect(execute).toHaveBeenCalledExactlyOnceWith('lender-1');
    expect(SubscriptionResponseSchema.parse(response)).toEqual(response);
    expect(response.currentPeriodEndsAt).toBe('2026-10-08T12:00:00.000Z');
    expect(response.status).toBe('GRACE_PERIOD');
    expect(response.prioritySupportUrl).toBeNull();
  });

  it('da el enlace del soporte prioritario solo si el plan lo trae', async () => {
    const env = {
      subscription: { prioritySupportUrl: 'https://wa.me/573000000000' },
    } as Env;
    const controllerFor = (details: SubscriptionDetails) =>
      new SubscriptionController(
        {
          execute: () => Promise.resolve(details),
        } as unknown as GetSubscriptionUseCase,
        env,
      );

    const team = await controllerFor({
      ...DETAILS,
      features: ['PRIORITY_SUPPORT'],
    }).get(SCOPE);
    const pro = await controllerFor(DETAILS).get(SCOPE);

    expect(team.prioritySupportUrl).toBe('https://wa.me/573000000000');
    expect(pro.prioritySupportUrl).toBeNull();
  });

  it('sin enlace configurado, el plan con soporte prioritario recibe null', async () => {
    const controller = new SubscriptionController(
      {
        execute: () =>
          Promise.resolve({ ...DETAILS, features: ['PRIORITY_SUPPORT'] }),
      } as unknown as GetSubscriptionUseCase,
      { subscription: {} } as Env,
    );

    expect((await controller.get(SCOPE)).prioritySupportUrl).toBeNull();
  });
});
