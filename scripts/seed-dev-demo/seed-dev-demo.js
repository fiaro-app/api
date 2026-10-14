/**
 * Llena de datos realistas el negocio de una persona (por su cédula) para ver cómo se comporta la
 * app con años de historia: 3 cobradores con su zona, decenas de deudores que renuevan préstamos
 * desde 2023, visitas diarias, pagos en efectivo/Nequi/transferencia, atrasos, castigos,
 * reversiones y cuadres diarios. Solo desarrollo.
 *
 * Uso (con el stack de Docker arriba y `pnpm build` hecho):
 *   node scripts/seed-dev-demo/seed-dev-demo.js [--national-id 1092851497] [--reset]
 *
 * `--reset` borra lo que sembró antes (sus deudores, con préstamos, visitas y pagos, y los cuadres
 * de sus cobradores) y vuelve a sembrar. Sin `--reset`, si ya hay datos de la demo, no hace nada.
 * Los cobradores inician sesión con su celular y la contraseña de `data.js`.
 */
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import pg from 'pg';
import { v7 } from 'uuid';
import {
  BUSINESS_SINCE,
  COLLECTOR_PASSWORD,
  COLLECTORS,
  ZONES,
  buildClients,
} from './data.js';
import {
  buildSettlements,
  seededRandom,
  simulateBusiness,
  zoneTimeline,
} from './simulate.js';
import { insertRows } from './insert.js';

if (existsSync('.env')) process.loadEnvFile('.env');
if (process.env.NODE_ENV === 'production')
  throw new Error('El seed es solo para desarrollo.');

const { values: args } = parseArgs({
  options: {
    'national-id': { type: 'string', default: '1092851497' },
    reset: { type: 'boolean', default: false },
  },
});
const today = new Date().toLocaleDateString('en-CA', {
  timeZone: 'America/Bogota',
});
const rand = seededRandom(1092851497);
const clients = buildClients(rand, 90);

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

const owner = await one(
  `select m.id as membership_id, l.id as lender_id, l.tenant_id, l.non_working_weekdays, l.skip_national_holidays
     from users u join memberships m on m.user_id = u.id join lenders l on l.id = m.lender_id
    where u.national_id = $1 and 'OWNER' = any(m.roles) limit 1`,
  [args['national-id']],
);
if (!owner)
  throw new Error(`No hay un dueño con cédula ${args['national-id']}.`);
const rules = {
  nonWorkingWeekdays: owner.non_working_weekdays
    .replace(/[{}]/g, '')
    .split(',')
    .filter(Boolean),
  skipNationalHolidays: owner.skip_national_holidays,
};

const seeded = await one(
  'select count(*)::int as n from clients where lender_id = $1 and national_id = any($2)',
  [owner.lender_id, clients.map((c) => c.nationalId)],
);
if (seeded.n > 0 && !args.reset) {
  console.log(
    'Ya hay datos de la demo en este negocio. Usa --reset para sembrarlos de nuevo.',
  );
  await db.end();
  process.exit(0);
}

const { AppModule } = await import('../../dist/app.module.js');
const { CreateUserUseCase } =
  await import('../../dist/modules/auth/application/use-cases/create-user.use-case.js');
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: false,
});
const createUser = app.get(CreateUserUseCase, { strict: false });
for (const collector of COLLECTORS) {
  try {
    await createUser.execute({ ...collector, password: COLLECTOR_PASSWORD });
  } catch (error) {
    if (error.code !== 'PHONE_ALREADY_REGISTERED') throw error;
  }
}
await app.close();

await db.query('begin');
try {
  if (args.reset) {
    await db.query(
      'delete from clients where lender_id = $1 and national_id = any($2)',
      [owner.lender_id, clients.map((c) => c.nationalId)],
    );
  }
  await db.query(
    `update lenders set created_at = $2 where id = $1 and created_at > $2`,
    [owner.lender_id, `${BUSINESS_SINCE}T09:00:00-05:00`],
  );
  await db.query(
    `update memberships set created_at = $2 where id = $1 and created_at > $2`,
    [owner.membership_id, `${BUSINESS_SINCE}T09:00:00-05:00`],
  );

  const zones = [];
  for (const [index, name] of ZONES.entries()) {
    const portfolio =
      (await one(
        'select id from portfolios where lender_id = $1 and name = $2',
        [owner.lender_id, name],
      )) ??
      (await one(
        'insert into portfolios (id, lender_id, name, is_default, created_at, updated_at) values ($1, $2, $3, false, $4, now()) returning id',
        [v7(), owner.lender_id, name, `${BUSINESS_SINCE}T09:00:00-05:00`],
      ));
    const collector = COLLECTORS.find((c) => c.zone === index);
    const user = await one('select id from users where phone = $1', [
      collector.phone,
    ]);
    await db.query('update users set created_at = $2 where id = $1', [
      user.id,
      `${collector.since}T08:00:00-05:00`,
    ]);
    const membership =
      (await one(
        'select id from memberships where user_id = $1 and lender_id = $2',
        [user.id, owner.lender_id],
      )) ??
      (await one(
        `insert into memberships (id, user_id, lender_id, roles, status, portfolio_id, created_at, updated_at) values ($1, $2, $3, '{COLLECTOR}', 'ACTIVE', $4, $5, now()) returning id`,
        [
          v7(),
          user.id,
          owner.lender_id,
          portfolio.id,
          `${collector.since}T08:00:00-05:00`,
        ],
      ));
    if (args.reset)
      await db.query(
        'delete from daily_settlements where collector_membership_id = $1',
        [membership.id],
      );
    zones.push({
      portfolioId: portfolio.id,
      collector: { ...collector, membershipId: membership.id },
    });
  }
  // Leidy salió a vacaciones en diciembre de 2025: la reemplazó el dueño.
  for (const zone of zones) {
    const vacations =
      zone.collector.zone === 1
        ? [
            {
              from: '2025-12-15',
              to: '2025-12-31',
              coverId: owner.membership_id,
            },
          ]
        : [];
    zone.timeline = zoneTimeline(
      zone.collector,
      owner.membership_id,
      vacations,
    );
  }

  for (const client of clients) client.id = v7();
  const rows = simulateBusiness({
    clients,
    zones,
    rules,
    today,
    since: BUSINESS_SINCE,
    rand,
    ownerMembershipId: owner.membership_id,
  });
  const settlements = buildSettlements({
    visits: rows.visits,
    collectorIds: new Set(zones.map((z) => z.collector.membershipId)),
    ownerMembershipId: owner.membership_id,
    today,
    rand,
  });
  await insertRows(db, {
    lenderId: owner.lender_id,
    clients,
    rows,
    settlements,
  });
  await db.query('commit');

  const active = rows.loans.filter((loan) => loan.status === 'ACTIVE').length;
  console.log(
    `Listo (${today}): ${clients.length} deudores, ${rows.loans.length} préstamos (${active} activos), ${rows.visits.length} visitas, ${rows.payments.length} pagos, ${rows.reversals.length} reversiones, ${settlements.length} cuadres.`,
  );
  for (const zone of zones)
    console.log(
      `  ${zone.collector.fullName}  ${zone.collector.phone}  contraseña: ${COLLECTOR_PASSWORD}`,
    );
} catch (error) {
  await db.query('rollback');
  throw error;
} finally {
  await db.end();
}
