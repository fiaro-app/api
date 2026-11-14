/**
 * Mide latencia (p50/p95/máx), tamaño de respuesta, total de registros y errores de las lecturas
 * caras de la API, en serie y con 20 peticiones simultáneas (PERFORMANCE.md). Solo desarrollo: usa
 * una cuenta de prueba de una base de datos aparte, nunca la de `pnpm docker:dev`.
 *
 * Uso:
 *   PERF_PHONE=+57... PERF_PASSWORD=... node scripts/perf/bench.js <baseUrl> <etiqueta> [rondas]
 *
 * Escribe el resultado en `bench-<etiqueta>.json` en el directorio actual.
 */
import { writeFileSync } from 'node:fs';

const [baseUrl, label, roundsArg] = process.argv.slice(2);
if (
  !baseUrl ||
  !label ||
  !process.env.PERF_PHONE ||
  !process.env.PERF_PASSWORD
) {
  throw new Error(
    'Uso: PERF_PHONE=... PERF_PASSWORD=... node scripts/perf/bench.js <baseUrl> <etiqueta> [rondas]',
  );
}
const ROUNDS = Number(roundsArg ?? 30);
const creds = {
  PERF_PHONE: process.env.PERF_PHONE,
  PERF_PASSWORD: process.env.PERF_PASSWORD,
};

const origin = baseUrl;
async function call(method, path, body, cookie) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    ms: performance.now() - started,
    bytes: Buffer.byteLength(text),
    text,
    headers: response.headers,
  };
}

const signIn = await call('POST', '/auth/sign-in/phone-number', {
  phoneNumber: creds.PERF_PHONE,
  password: creds.PERF_PASSWORD,
});
const cookie = signIn.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ');
if (signIn.status !== 200)
  throw new Error(`sign-in ${signIn.status} ${signIn.text}`);

const collectors = JSON.parse(
  (
    await call(
      'QUERY',
      '/memberships',
      { page: 1, pageSize: 50, role: 'COLLECTOR', status: 'ACTIVE' },
      cookie,
    )
  ).text,
).data;
const collectorId =
  collectors.find((c) => !c.roles.includes('OWNER'))?.id ?? collectors[0].id;
const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
const daysAgo = (n) =>
  new Date(Date.now() - 5 * 3600 * 1000 - n * 86400000)
    .toISOString()
    .slice(0, 10);

const cases = [
  ['GET', '/lenders/me/dashboard', undefined, 'resumen'],
  ['QUERY', '/lenders/me/stats', {}, 'estadísticas (mes)'],
  [
    'QUERY',
    '/lenders/me/stats',
    { includePrevious: true, dateRange: { from: daysAgo(364), to: today } },
    'estadísticas (año + anterior)',
  ],
  [
    'QUERY',
    '/lenders/me/stats/top-arrears',
    { page: 1, pageSize: 10 },
    'mayor mora (página)',
  ],
  [
    'QUERY',
    '/lenders/me/stats/collector-performance',
    { page: 1, pageSize: 10 },
    'desempeño (página)',
  ],
  [
    'GET',
    `/collectors/${collectorId}/stats`,
    undefined,
    'desempeño de un cobrador',
  ],
  ['QUERY', '/loans', { page: 1, pageSize: 10 }, 'préstamos (10)'],
  [
    'QUERY',
    '/loans',
    { page: 1, pageSize: 20 },
    'préstamos (20, tamaño viejo)',
  ],
  ['QUERY', '/clients', { page: 1, pageSize: 10 }, 'clientes (10)'],
  [
    'QUERY',
    '/clients',
    { page: 1, pageSize: 100 },
    'clientes (100, carga completa de la web vieja)',
  ],
  [
    'QUERY',
    '/collection-visits',
    { page: 1, pageSize: 10, dateRange: { from: daysAgo(30), to: today } },
    'cobros 30 días',
  ],
  [
    'QUERY',
    '/collection-visits',
    { page: 1, pageSize: 10, dateRange: { from: '2023-01-01', to: today } },
    'cobros desde 2023 (rango largo)',
  ],
  ['QUERY', '/daily-settlements', { page: 1, pageSize: 10 }, 'cuadres'],
];

const pct = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  ];
};

const results = [];
for (const [method, path, body, name] of cases) {
  const times = [];
  let errors = 0;
  let status = 0;
  let bytes = 0;
  let records = null;
  for (let i = 0; i < ROUNDS + 3; i++) {
    const r = await call(method, path, body, cookie);
    status = r.status;
    if (r.status >= 400) errors++;
    if (i >= 3) times.push(r.ms);
    bytes = r.bytes;
    if (r.status < 400 && records === null) {
      const json = JSON.parse(r.text);
      records = json.meta?.total ?? null;
    }
  }
  results.push({
    name,
    status,
    p50: pct(times, 50),
    p95: pct(times, 95),
    max: Math.max(...times),
    bytes,
    records,
    errors,
  });
}

// Concurrencia: 20 peticiones a la vez de las estadísticas del año, 5 tandas.
const concurrent = [];
let concurrentErrors = 0;
for (let round = 0; round < 5; round++) {
  const batch = await Promise.all(
    Array.from({ length: 20 }, () =>
      call('QUERY', '/lenders/me/stats', { includePrevious: true }, cookie),
    ),
  );
  for (const r of batch) {
    concurrent.push(r.ms);
    if (r.status >= 400) concurrentErrors++;
  }
}

const report = {
  label,
  rounds: ROUNDS,
  results,
  concurrency: {
    requests: concurrent.length,
    p50: pct(concurrent, 50),
    p95: pct(concurrent, 95),
    max: Math.max(...concurrent),
    errors: concurrentErrors,
  },
};
writeFileSync(`bench-${label}.json`, JSON.stringify(report, null, 2));
const fmt = (n) => (n === undefined ? '-' : n.toFixed(1));
console.log(`\n${label} (${ROUNDS} rondas)`);
for (const r of results) {
  console.log(
    `${r.name.padEnd(48)} ${String(r.status).padStart(3)} p50 ${fmt(r.p50).padStart(7)} p95 ${fmt(r.p95).padStart(7)} máx ${fmt(r.max).padStart(7)} ms  ${String(r.bytes).padStart(7)} B  total=${r.records ?? '-'} errores=${r.errors}`,
  );
}
console.log(
  `concurrencia 20×5 estadísticas: p50 ${fmt(report.concurrency.p50)} p95 ${fmt(report.concurrency.p95)} máx ${fmt(report.concurrency.max)} ms errores=${report.concurrency.errors}`,
);
