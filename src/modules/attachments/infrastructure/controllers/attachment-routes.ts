import type { AttachmentKind } from '@/modules/attachments/domain/attachment-kind.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

/** Quién pide y sobre qué foto, tal como lo piden los casos de uso. */
export function targetOf(
  kind: AttachmentKind,
  ownerId: string,
  scope: LenderScope,
) {
  return {
    kind,
    ownerId,
    actor: {
      lenderId: scope.lenderId,
      membershipId: scope.membershipId,
      roles: scope.roles,
    },
  };
}
