/**
 * Simula años de operación de un prestamista: préstamos que se renuevan, visitas diarias, pagos
 * por perfil de cliente, atrasos, castigos, reversiones y cuadres diarios. Todo en memoria; el
 * guardado lo hace `seed-dev-demo.js`. Las fechas de cuota salen de las mismas funciones que usa
 * la API (`computeExpectedInstallmentDates`, `isWorkingDay`), así que la app calcula los mismos
 * saldos y atrasos que se simularon.
 */
import { v7 } from 'uuid';
import {
  addDays,
  daysBetween,
} from '../../dist/shared/domain/calendar/business-date.js';
import { computeExpectedInstallmentDates } from '../../dist/shared/domain/calendar/loan-schedule.js';
import {
  isWorkingDay,
  nextWorkingDayOnOrAfter,
} from '../../dist/shared/domain/calendar/working-day.js';
import { REVERSAL_REASONS, SHORTFALL_NOTES } from './data.js';

const PAY_PROBABILITY = {
  punctual: 0.94,
  regular: 0.8,
  irregular: 0.62,
  bad: 0.78,
};

/** Generador pseudoaleatorio con semilla (mulberry32): la misma semilla da los mismos datos. */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Instante en Colombia (UTC−5) de una fecha y una hora local. */
function instant(date, minutesOfDay) {
  const hh = String(Math.floor(minutesOfDay / 60)).padStart(2, '0');
  const mm = String(minutesOfDay % 60).padStart(2, '0');
  return new Date(`${date}T${hh}:${mm}:00-05:00`);
}

function loanTerms(rand, principalBoost) {
  const roll = rand();
  const pick = (list) => list[Math.floor(rand() * list.length)];
  let frequency, principal, count, rate;
  if (roll < 0.6) {
    frequency = 'DAILY';
    principal = pick([
      200_000, 300_000, 400_000, 500_000, 600_000, 800_000, 1_000_000,
      1_500_000,
    ]);
    count = pick([20, 24, 30]);
    rate = 0.2;
  } else if (roll < 0.8) {
    frequency = 'WEEKLY';
    principal = pick([500_000, 800_000, 1_000_000, 1_500_000, 2_000_000]);
    count = pick([8, 10]);
    rate = 0.25;
  } else if (roll < 0.92) {
    frequency = 'BIWEEKLY';
    principal = pick([800_000, 1_200_000, 2_000_000, 3_000_000]);
    count = pick([4, 6]);
    rate = count === 4 ? 0.2 : 0.3;
  } else {
    frequency = 'MONTHLY';
    principal = pick([1_000_000, 2_000_000, 3_000_000, 5_000_000]);
    count = pick([3, 4, 6]);
    rate = 0.1 * count;
  }
  principal = Math.min(
    Math.round((principal * principalBoost) / 50_000) * 50_000,
    8_000_000,
  );
  const installmentValue =
    Math.ceil((principal * (1 + rate)) / count / 500) * 500;
  return {
    frequency,
    principalAmount: principal,
    installmentCount: count,
    installmentValue,
    totalPayable: installmentValue * count,
  };
}

/**
 * Quién cobra la zona cada día: el dueño hasta que llega el cobrador, salvo los reemplazos.
 *
 * @returns Tramos `{ from, to, membershipId }` con `to` inclusivo o `null`.
 */
export function zoneTimeline(collector, ownerMembershipId, vacations) {
  const segments = [
    {
      from: '2000-01-01',
      to: addDays(collector.since, -1),
      membershipId: ownerMembershipId,
    },
  ];
  let cursor = collector.since;
  for (const vacation of vacations) {
    segments.push({
      from: cursor,
      to: addDays(vacation.from, -1),
      membershipId: collector.membershipId,
    });
    segments.push({
      from: vacation.from,
      to: vacation.to,
      membershipId: vacation.coverId,
    });
    cursor = addDays(vacation.to, 1);
  }
  segments.push({
    from: cursor,
    to: null,
    membershipId: collector.membershipId,
  });
  return segments;
}

const collectorOn = (timeline, date) =>
  timeline.find(
    (segment) =>
      segment.from <= date && (segment.to === null || date <= segment.to),
  ).membershipId;

/** Asignaciones del préstamo: los tramos de la zona que tocan su vida, recortados a ella. */
function assignmentsFor(loan, timeline, endDate) {
  return timeline
    .filter(
      (segment) =>
        (segment.to === null || segment.to >= loan.startDate) &&
        segment.from <= endDate,
    )
    .map((segment, index, list) => ({
      id: v7(),
      loanId: loan.id,
      membershipId: segment.membershipId,
      effectiveFrom:
        segment.from < loan.startDate ? loan.startDate : segment.from,
      effectiveTo: index === list.length - 1 ? null : segment.to,
      createdAt: instant(
        segment.from < loan.startDate ? loan.startDate : segment.from,
        7 * 60,
      ),
    }));
}

/** Simula la vida de un préstamo hasta `today` y devuelve sus visitas, pagos y estado final. */
function simulateLoan({
  loan,
  client,
  rules,
  timeline,
  today,
  rand,
  ownerMembershipId,
}) {
  const dueDates = computeExpectedInstallmentDates({ ...loan, ...rules });
  const breakAt =
    client.profile === 'bad'
      ? Math.floor(loan.installmentCount * (0.3 + rand() * 0.4))
      : Infinity;
  const visits = [];
  const reversals = [];
  let paid = 0;
  let lastVisit = null;
  let promised = null;
  let day = dueDates[0];
  while (day <= today) {
    const dueCount = dueDates.filter((date) => date <= day).length;
    const owed = dueCount * loan.installmentValue - paid;
    const overdueDays =
      owed > 0
        ? daysBetween(
            dueDates[Math.floor(paid / loan.installmentValue)] ?? day,
            day,
          )
        : 0;
    const isDueDay = dueDates.includes(day);
    const sinceLast = lastVisit ? daysBetween(lastVisit, day) : Infinity;
    const shouldVisit =
      owed > 0 &&
      ((loan.frequency === 'DAILY' &&
        (isDueDay || owed > 0) &&
        (overdueDays < 30 || sinceLast >= 7)) ||
        (loan.frequency !== 'DAILY' &&
          (isDueDay ||
            (owed > 0 &&
              (day === promised || sinceLast >= (overdueDays < 30 ? 3 : 7))))));
    const isToday = day === today;
    if (shouldVisit && !(isToday && rand() < 0.3)) {
      lastVisit = day;
      const collector = collectorOn(timeline, day);
      const late = Math.floor(paid / loan.installmentValue) >= breakAt;
      const pPay = late ? 0.12 : PAY_PROBABILITY[client.profile];
      const visit = {
        id: v7(),
        loanId: loan.id,
        collectorMembershipId: collector,
        expectedAmount: loan.installmentValue,
        occurredAt: instant(day, 8 * 60 + Math.floor(rand() * 570)),
        promisedDate: null,
        payment: null,
      };
      if (rand() < pPay) {
        const balance = loan.totalPayable - paid;
        let amount = loan.installmentValue;
        if (owed > loan.installmentValue && rand() < 0.3)
          amount = Math.min(owed, loan.installmentValue * 2);
        else if (rand() < 0.07)
          amount = Math.max(
            1000,
            Math.round(loan.installmentValue / 2 / 1000) * 1000,
          );
        amount = Math.min(amount, balance);
        const methodRoll = rand();
        const method =
          methodRoll < 0.7 ? 'CASH' : methodRoll < 0.92 ? 'NEQUI' : 'TRANSFER';
        visit.outcome = 'PAID';
        visit.payment = {
          id: v7(),
          loanId: loan.id,
          visitId: visit.id,
          amount,
          method,
          occurredAt: visit.occurredAt,
        };
        if (rand() < 0.0025 && !isToday) {
          reversals.push({
            id: v7(),
            paymentId: visit.payment.id,
            reason:
              REVERSAL_REASONS[Math.floor(rand() * REVERSAL_REASONS.length)],
            reversedByMembershipId: ownerMembershipId,
            createdAt: instant(addDays(day, 1), 9 * 60),
          });
        } else {
          paid += amount;
        }
      } else {
        const roll = rand();
        visit.outcome =
          roll < 0.45 ? 'NOT_FOUND' : roll < 0.85 ? 'RESCHEDULED' : 'REFUSED';
        if (visit.outcome === 'RESCHEDULED') {
          promised = nextWorkingDayOnOrAfter(
            addDays(day, 1 + Math.floor(rand() * 3)),
            rules,
          );
          visit.promisedDate = promised;
        }
      }
      visits.push(visit);
      if (paid >= loan.totalPayable)
        return {
          visits,
          reversals,
          status: 'PAID_OFF',
          closedOn: day,
          closedAt: visit.occurredAt,
        };
      if (
        client.profile === 'bad' &&
        overdueDays > 75 &&
        daysBetween(day, today) > 120 &&
        rand() < 0.05
      ) {
        return {
          visits,
          reversals,
          status: 'CANCELED',
          closedOn: day,
          closedAt: instant(day, 18 * 60),
        };
      }
    }
    day = nextWorkingDayOnOrAfter(addDays(day, 1), rules);
  }
  return {
    visits,
    reversals,
    status: 'ACTIVE',
    closedOn: null,
    closedAt: null,
  };
}

/**
 * Simula a todos los deudores: cada uno empieza en algún momento y renueva al terminar de pagar.
 *
 * @returns Filas listas para insertar.
 */
export function simulateBusiness({
  clients,
  zones,
  rules,
  today,
  since,
  rand,
  ownerMembershipId,
}) {
  const rows = {
    loans: [],
    assignments: [],
    visits: [],
    payments: [],
    reversals: [],
  };
  const span = daysBetween(since, today);
  for (const client of clients) {
    let start = addDays(since, Math.floor(Math.pow(rand(), 0.7) * span));
    let boost = 1;
    client.createdAt = instant(start, 10 * 60);
    while (start < today) {
      const terms = loanTerms(rand, boost);
      const loan = {
        id: v7(),
        clientId: client.id,
        startDate: start,
        ...terms,
      };
      const timeline = zones[client.zone].timeline;
      const result = simulateLoan({
        loan,
        client,
        rules,
        timeline,
        today,
        rand,
        ownerMembershipId,
      });
      loan.status = result.status;
      loan.closedAt = result.closedAt;
      loan.createdAt = instant(start, 9 * 60 + Math.floor(rand() * 120));
      loan.createdByMembershipId = ownerMembershipId;
      rows.loans.push(loan);
      rows.assignments.push(
        ...assignmentsFor(loan, timeline, result.closedOn ?? today),
      );
      rows.visits.push(...result.visits);
      rows.payments.push(
        ...result.visits
          .filter((visit) => visit.payment)
          .map((visit) => visit.payment),
      );
      rows.reversals.push(...result.reversals);
      if (result.status !== 'PAID_OFF') break;
      const renews = rand() < 0.86;
      const gap = renews
        ? Math.floor(rand() * 8)
        : 30 + Math.floor(rand() * 200);
      if (!renews && rand() < 0.35) break;
      boost = Math.min(boost * (renews ? 1.15 : 1), 3);
      start = nextWorkingDayOnOrAfter(addDays(result.closedOn, gap), rules);
    }
  }
  return rows;
}

/**
 * Cuadres diarios de cada cobrador (el dueño no se cuadra a sí mismo): aprobados en el pasado,
 * el de ayer pendiente y un par de rechazados recientes; el de hoy aún no se ha enviado.
 */
export function buildSettlements({
  visits,
  collectorIds,
  ownerMembershipId,
  today,
  rand,
}) {
  const byKey = new Map();
  for (const visit of visits) {
    if (!collectorIds.has(visit.collectorMembershipId)) continue;
    const date = visit.occurredAt.toLocaleDateString('en-CA', {
      timeZone: 'America/Bogota',
    });
    if (date >= today) continue;
    const key = `${visit.collectorMembershipId}|${date}`;
    const day = byKey.get(key) ?? {
      collectorMembershipId: visit.collectorMembershipId,
      date,
      expected: 0,
      cash: 0,
      nequi: 0,
      transfer: 0,
      unpaid: 0,
    };
    day.expected += visit.expectedAmount;
    if (visit.payment)
      day[visit.payment.method.toLowerCase()] += visit.payment.amount;
    else day.unpaid += 1;
    byKey.set(key, day);
  }
  const yesterday = [...byKey.values()].reduce(
    (latest, day) => (day.date > latest ? day.date : latest),
    '',
  );
  let rejected = 0;
  return [...byKey.values()].map((day) => {
    const collected = day.cash + day.nequi + day.transfer;
    const recent = daysBetween(day.date, today) <= 14;
    let status = day.date === yesterday ? 'PENDING' : 'APPROVED';
    if (status === 'APPROVED' && recent && rejected < 2 && rand() < 0.08) {
      status = 'REJECTED';
      rejected += 1;
    }
    const note = SHORTFALL_NOTES[Math.floor(rand() * SHORTFALL_NOTES.length)](
      Math.max(day.unpaid, 1),
    );
    return {
      id: v7(),
      collectorMembershipId: day.collectorMembershipId,
      date: day.date,
      expectedAmount: day.expected,
      collectedAmount: collected,
      collectedCash: day.cash,
      collectedNequi: day.nequi,
      collectedTransfer: day.transfer,
      status,
      collectorNote: collected === day.expected ? null : note,
      reviewNote:
        status === 'REJECTED'
          ? 'El efectivo entregado no cuadra con lo registrado. Revisa y vuelve a enviar.'
          : null,
      reviewedByMembershipId: status === 'PENDING' ? null : ownerMembershipId,
      reviewedAt:
        status === 'PENDING'
          ? null
          : instant(addDays(day.date, 1), 7 * 60 + Math.floor(rand() * 90)),
      submittedAt: instant(day.date, 18 * 60 + Math.floor(rand() * 100)),
    };
  });
}

export { isWorkingDay };
