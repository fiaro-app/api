import { IdSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** A quién pasa un préstamo que el cobrador dado de baja tenía asignado hoy. */
const CollectorReassignmentSchema = z.strictObject({
  loanId: IdSchema.meta({
    description:
      'El préstamo, activo y asignado hoy al cobrador que se da de baja.',
  }),
  collectorMembershipId: IdSchema.meta({
    description:
      'El cobrador nuevo: activo, con el rol COLLECTOR, y no el mismo que se da de baja.',
  }),
});

/** Cuerpo de `POST /collectors/:id/deactivate`. */
export const DeactivateCollectorRequestSchema = z.strictObject({
  reassignments: z.array(CollectorReassignmentSchema).default([]).meta({
    description:
      'A quién pasa cada préstamo activo que el cobrador tiene asignado hoy. Debe cubrir exactamente esos préstamos, ni de más ni de menos; vacío si no tiene ninguno.',
  }),
});
