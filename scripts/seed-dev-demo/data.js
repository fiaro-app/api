/**
 * Datos ficticios de la demo: cobradores, zonas (carteras) y deudores de Cúcuta y su área
 * metropolitana. Nombres, cédulas, celulares y direcciones son inventados.
 */

/** Contraseña de los cobradores de la demo. Solo desarrollo: es pública a propósito. */
export const COLLECTOR_PASSWORD = 'cobrador-demo-2026'; // NOSONAR: contraseña de desarrollo, pública.

/** Zonas de cobro. Cada una es una cartera (`Portfolio`) con su cobrador. */
export const ZONES = [
  'Centro y Libertad',
  'Atalaya',
  'Los Patios y Villa del Rosario',
];

/**
 * Cobradores nuevos. `since` es cuándo empezó a cobrar; antes de su llegada, su zona la cobraba
 * el dueño (o quien estuviera). `zone` es el índice en `ZONES`.
 */
export const COLLECTORS = [
  {
    fullName: 'Yeison Andrés Pabón Ríos',
    phone: '+573154820193',
    nationalId: '1090487231',
    contactEmail: 'yeison.pabon@fiaro.dev',
    since: '2023-06-05',
    zone: 0,
  },
  {
    fullName: 'Leidy Johana Carrillo Méndez',
    phone: '+573017741265',
    nationalId: '1093765412',
    contactEmail: 'leidy.carrillo@fiaro.dev',
    since: '2024-02-12',
    zone: 1,
  },
  {
    fullName: 'Wilmer Alexis Suárez Ortega',
    phone: '+573208893412',
    nationalId: '1094267731',
    contactEmail: null,
    since: '2025-06-02',
    zone: 2,
  },
];

/** Desde cuándo el negocio presta (el dueño cobraba solo al principio). */
export const BUSINESS_SINCE = '2023-01-16';

const BARRIOS = [
  ['La Libertad', 'Calle 7 # 22-41', 0],
  ['El Llano', 'Avenida 4 # 9-18', 0],
  ['Centro', 'Calle 10 # 5-37 local 3', 0],
  ['Motilones', 'Calle 14 # 23-60', 0],
  ['Comuneros', 'Manzana 12 casa 8', 0],
  ['Belén', 'Calle 22 # 27-15', 0],
  ['Atalaya primera etapa', 'Avenida 6 # 3-29', 1],
  ['Atalaya segunda etapa', 'Calle 4N # 8-45', 1],
  ['Juan Atalaya', 'Manzana C lote 14', 1],
  ['Antonia Santos', 'Calle 3 # 11-02', 1],
  ['Cúcuta 75', 'Avenida 1 # 17-83', 1],
  ['Los Patios centro', 'Calle 30 # 9-21 Los Patios', 2],
  ['La Sabana', 'Manzana F casa 22 Los Patios', 2],
  ['Villa del Rosario', 'Calle 5 # 7-14 Villa del Rosario', 2],
  ['La Parada', 'Avenida 3 # 2-40 La Parada', 2],
];

const OCCUPATIONS = [
  'Tienda de barrio',
  'Venta de arepas',
  'Mototaxista',
  'Peluquería',
  'Modista',
  'Venta de minutos',
  'Carnicería',
  'Ferretería',
  'Panadería',
  'Taller de motos',
  'Venta de empanadas',
  'Lavandería',
  'Papelería',
  'Venta de frutas',
  'Venta de ropa',
  'Miscelánea',
  'Comidas rápidas',
  'Venta de chance',
  'Venta de jugos',
  'Zapatería',
];

const FIRST = [
  'María Fernanda',
  'José Luis',
  'Luz Marina',
  'Carlos Alberto',
  'Yuli Paola',
  'Jhon Fredy',
  'Ana Milena',
  'Edinson',
  'Diana Carolina',
  'Wilson',
  'Rosa Elena',
  'Jairo',
  'Sandra Patricia',
  'Óscar Iván',
  'Gladys',
  'Héctor Julio',
  'Marleny',
  'Brayan Stiven',
  'Nelly',
  'Fabio',
  'Yaneth',
  'Albeiro',
  'Claudia Marcela',
  'Hernando',
  'Leonor',
  'Deiby',
  'Martha Cecilia',
  'Ramiro',
  'Zulay',
  'Freddy',
  'Ingrid Tatiana',
  'Orlando',
  'Blanca Nubia',
  'Kevin Andrés',
  'Dora Inés',
  'Gustavo',
  'Esperanza',
  'Rubén Darío',
  'Mayerly',
  'Libardo',
  'Carmen Rosa',
  'Duván',
  'Omaira',
  'Elkin',
  'Ludy',
  'Nelson Enrique',
];

const LAST = [
  'Contreras',
  'Jaimes',
  'Rincón',
  'Ortega',
  'Sepúlveda',
  'Villamizar',
  'Peñaranda',
  'Durán',
  'Quintero',
  'Galvis',
  'Mora',
  'Carrascal',
  'Ibarra',
  'Parada',
  'Rozo',
  'Lizcano',
  'Vera',
  'Bautista',
  'Rangel',
  'Sanguino',
  'Ascanio',
  'Mogollón',
  'Pacheco',
  'Torrado',
  'Duarte',
];

/**
 * Perfil de pago: probabilidad de pagar en cada visita y qué tanto se atrasa.
 * `bad` paga bien al principio y después deja de pagar (termina en mora o castigado).
 */
const PROFILES = [
  'punctual',
  'punctual',
  'punctual',
  'regular',
  'regular',
  'regular',
  'irregular',
  'irregular',
  'bad',
];

/**
 * Genera los deudores de forma determinista con el generador `rand`.
 *
 * @param rand - Generador pseudoaleatorio entre 0 y 1.
 * @param count - Cuántos deudores.
 */
export function buildClients(rand, count) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const clients = [];
  for (let index = 0; index < count; index++) {
    const [barrio, street, zone] = BARRIOS[index % BARRIOS.length];
    const fullName = `${FIRST[index % FIRST.length]} ${pick(LAST)} ${pick(LAST)}`;
    clients.push({
      fullName,
      nationalId: String(
        1090000000 + Math.floor(rand() * 9000000) + index * 997,
      ),
      phone: `+5731${String(10000000 + Math.floor(rand() * 89999999)).slice(0, 8)}`,
      occupation: pick(OCCUPATIONS),
      address: `${street}, barrio ${barrio}`,
      zone,
      profile: pick(PROFILES),
    });
  }
  return clients;
}

/** Notas que deja un cobrador cuando lo recogido no cuadra con lo esperado. */
export const SHORTFALL_NOTES = [
  (n) => `${n} clientes no estaban en la casa.`,
  (n) => `${n} clientes pidieron plazo para mañana.`,
  (n) => `No me pagaron ${n}; uno dijo que pasaba por Nequi.`,
  (n) => `Llovió toda la tarde, quedaron ${n} sin visitar bien.`,
  (n) => `${n} cerrados por la mañana, vuelvo el jueves.`,
];

/** Motivos reales de una reversión de pago. */
export const REVERSAL_REASONS = [
  'El cobrador digitó mal el valor.',
  'El Nequi no llegó, el cliente mostró un pantallazo falso.',
  'Pago registrado dos veces por mala señal.',
  'Se le cargó el pago al préstamo equivocado.',
];
