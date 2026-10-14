/** Inserta las filas simuladas en lotes (una sentencia por cada 1000 filas). */

async function insertMany(db, table, columns, records) {
  for (let start = 0; start < records.length; start += 1000) {
    const batch = records.slice(start, start + 1000);
    const params = [];
    const tuples = batch.map((record) => {
      const placeholders = record.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await db.query(
      `insert into ${table} (${columns.join(', ')}) values ${tuples.join(', ')}`,
      params,
    );
  }
}

/** Guarda deudores, préstamos, asignaciones, visitas, pagos, reversiones y cuadres. */
export async function insertRows(db, { lenderId, clients, rows, settlements }) {
  await insertMany(
    db,
    'clients',
    [
      'id',
      'lender_id',
      'national_id',
      'full_name',
      'occupation',
      'phone',
      'address',
      'created_at',
      'updated_at',
    ],
    clients.map((c) => [
      c.id,
      lenderId,
      c.nationalId,
      c.fullName,
      c.occupation,
      c.phone,
      c.address,
      c.createdAt,
      c.createdAt,
    ]),
  );
  await insertMany(
    db,
    'loans',
    [
      'id',
      'lender_id',
      'client_id',
      'principal_amount',
      'installment_count',
      'installment_value',
      'total_payable',
      'frequency',
      'start_date',
      'status',
      'created_by_membership_id',
      'created_at',
      'updated_at',
      'closed_at',
    ],
    rows.loans.map((l) => [
      l.id,
      lenderId,
      l.clientId,
      l.principalAmount,
      l.installmentCount,
      l.installmentValue,
      l.totalPayable,
      l.frequency,
      l.startDate,
      l.status,
      l.createdByMembershipId,
      l.createdAt,
      l.closedAt ?? l.createdAt,
      l.closedAt,
    ]),
  );
  await insertMany(
    db,
    'collection_assignments',
    [
      'id',
      'loan_id',
      'collector_membership_id',
      'effective_from',
      'effective_to',
      'created_at',
    ],
    rows.assignments.map((a) => [
      a.id,
      a.loanId,
      a.membershipId,
      a.effectiveFrom,
      a.effectiveTo,
      a.createdAt,
    ]),
  );
  await insertMany(
    db,
    'collection_visits',
    [
      'id',
      'loan_id',
      'collector_membership_id',
      'outcome',
      'expected_amount',
      'promised_date',
      'occurred_at',
      'created_at',
    ],
    rows.visits.map((v) => [
      v.id,
      v.loanId,
      v.collectorMembershipId,
      v.outcome,
      v.expectedAmount,
      v.promisedDate,
      v.occurredAt,
      v.occurredAt,
    ]),
  );
  await insertMany(
    db,
    'payments',
    [
      'id',
      'loan_id',
      'visit_id',
      'amount',
      'method',
      'occurred_at',
      'created_at',
    ],
    rows.payments.map((p) => [
      p.id,
      p.loanId,
      p.visitId,
      p.amount,
      p.method,
      p.occurredAt,
      p.occurredAt,
    ]),
  );
  await insertMany(
    db,
    'payment_reversals',
    ['id', 'payment_id', 'reason', 'reversed_by_membership_id', 'created_at'],
    rows.reversals.map((r) => [
      r.id,
      r.paymentId,
      r.reason,
      r.reversedByMembershipId,
      r.createdAt,
    ]),
  );
  await insertMany(
    db,
    'daily_settlements',
    [
      'id',
      'collector_membership_id',
      'date',
      'expected_amount',
      'collected_amount',
      'collected_cash',
      'collected_nequi',
      'collected_transfer',
      'status',
      'collector_note',
      'review_note',
      'reviewed_by_membership_id',
      'reviewed_at',
      'submitted_at',
      'created_at',
    ],
    settlements.map((s) => [
      s.id,
      s.collectorMembershipId,
      s.date,
      s.expectedAmount,
      s.collectedAmount,
      s.collectedCash,
      s.collectedNequi,
      s.collectedTransfer,
      s.status,
      s.collectorNote,
      s.reviewNote,
      s.reviewedByMembershipId,
      s.reviewedAt,
      s.submittedAt,
      s.submittedAt,
    ]),
  );
}
