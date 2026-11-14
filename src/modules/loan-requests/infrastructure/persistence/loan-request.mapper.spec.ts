import { describe, expect, it } from 'vitest';
import {
  buildRequest,
  NEW_CLIENT,
  NOW,
  TERMS,
} from '@/modules/loan-requests/__fixtures__/loan-request.fixture.js';
import {
  toLoanRequest,
  toLoanRequestCreateInput,
} from '@/modules/loan-requests/infrastructure/persistence/loan-request.mapper.js';

const ROW = {
  id: 'request-1',
  lenderId: 'lender-1',
  requestedByMembershipId: 'collector-membership',
  clientId: null,
  nationalId: '1020304050',
  clientFullName: NEW_CLIENT.fullName,
  clientOccupation: NEW_CLIENT.occupation,
  clientPhone: NEW_CLIENT.phone,
  clientAddress: NEW_CLIENT.address,
  ...TERMS,
  status: 'PENDING' as const,
  resolvedByMembershipId: null,
  resolvedAt: null,
  rejectionReason: null,
  loanId: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('toLoanRequestCreateInput', () => {
  it('aplana al cliente nuevo y las condiciones', () => {
    expect(toLoanRequestCreateInput(buildRequest())).toEqual({
      id: 'request-1',
      lenderId: 'lender-1',
      requestedByMembershipId: 'collector-membership',
      clientId: null,
      nationalId: '1020304050',
      clientFullName: NEW_CLIENT.fullName,
      clientOccupation: NEW_CLIENT.occupation,
      clientPhone: NEW_CLIENT.phone,
      clientAddress: NEW_CLIENT.address,
      ...TERMS,
      status: 'PENDING',
      createdAt: NOW,
    });
  });

  it('deja los datos del cliente en null cuando el cliente ya existía', () => {
    const input = toLoanRequestCreateInput(
      buildRequest({ clientId: 'client-1', newClient: null }),
    );

    expect(input).toMatchObject({
      clientId: 'client-1',
      clientFullName: null,
      clientOccupation: null,
      clientPhone: null,
      clientAddress: null,
    });
  });
});

describe('toLoanRequest', () => {
  it('reconstruye la solicitud con su cliente nuevo y sus condiciones', () => {
    expect(toLoanRequest(ROW)).toEqual(buildRequest());
  });

  it('sin datos del cliente deja newClient en null', () => {
    const request = toLoanRequest({
      ...ROW,
      clientId: 'client-1',
      clientFullName: null,
      clientOccupation: null,
      clientPhone: null,
      clientAddress: null,
    });

    expect(request.newClient).toBeNull();
    expect(request.clientId).toBe('client-1');
  });

  it.each(['clientOccupation', 'clientPhone', 'clientAddress'] as const)(
    'con %s en null no inventa un cliente a medias',
    (field) => {
      expect(toLoanRequest({ ...ROW, [field]: null }).newClient).toBeNull();
    },
  );
});
