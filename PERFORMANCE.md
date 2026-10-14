# Rendimiento de la API

Mediciones de las lecturas caras de la API antes y después de la lista de tareas técnicas del
2026-10-13 (D-116 a D-119). Sirven de línea base: repetirlas con el mismo procedimiento antes de
dar por buena una optimización o de cambiar un tope.

## Cómo se midió

- **Máquina:** MacBook (Apple Silicon), PostgreSQL 18 y Redis 8 en Docker, una sola instancia de la
  API (`node dist/main.js`, `NODE_ENV=development`, `LOG_LEVEL=warn`), sin red de por medio.
- **Datos:** una base de datos aparte (nunca la de `pnpm docker:dev`) con un negocio de prueba
  sembrado por `scripts/seed-dev-demo` (3 cobradores, historia diaria desde 2023):

  | Conjunto | Deudores | Préstamos (activos) | Visitas | Pagos | Cuadres |
  | --- | ---: | ---: | ---: | ---: | ---: |
  | **A** — representativo (`--clients 90`) | 90 | 562 (51) | 10.854 | 8.689 | 2.249 |
  | **B** — ×10 (`--clients 900`) | 900 | 5.954 (471) | 122.165 | 92.944 | 2.301 |

- **Script:** `scripts/perf/bench.js`. Cada consulta se repite 30 veces en A y 15 en B, después de 3
  de calentamiento, y se reporta p50, p95 y máximo. La prueba de concurrencia lanza 20
  `QUERY /lenders/me/stats { includePrevious: true }` a la vez, 5 tandas.
- **Versiones:**
  - **Antes:** `dev` en `cd9a988` (antes de D-116).
  - **D-117:** paginación 10/50, rangos acotados y listas de estadísticas (api #66), sin caché.
  - **Optimizado:** D-117 + lecturas en tandas (D-119), sin caché.
  - **+ caché:** Optimizado con la caché de lecturas en Redis (D-118).

  Las cuatro corrieron con `@fiaro-app/contracts` 0.10.0 instalado, así que «antes» ya rechaza
  páginas de más de 50: por eso `clientes (100)` sale 400 en todas.

## Resultados — conjunto A (representativo)

Latencia p50 / p95 en milisegundos.

| Lectura | Antes | D-117 | Optimizado | + caché |
| --- | ---: | ---: | ---: | ---: |
| Resumen (`GET /lenders/me/dashboard`) | 43,7 / 47,3 | 44,2 / 52,6 | **11,1 / 13,4** | 3,0 / 3,8 |
| Estadísticas del mes | 55,7 / 70,3 | 55,8 / 62,2 | **14,4 / 16,2** | 2,9 / 3,2 |
| Estadísticas del año + período anterior | 147,6 / 160,3 | 142,0 / 157,0 | **60,1 / 67,2** | 2,7 / 2,9 |
| Mayor mora, página completa | — (no existía) | 17,3 / 18,6 | **6,9 / 8,3** | 2,7 / 2,9 |
| Desempeño por cobrador, página | — (no existía) | 40,8 / 51,6 | **10,7 / 13,8** | 2,8 / 3,0 |
| Desempeño de un cobrador | 16,6 / 17,9 | 16,8 / 18,2 | **6,3 / 7,5** | 2,7 / 2,9 |
| Préstamos, 10 por página | 4,3 / 4,8 | 4,2 / 4,6 | 4,3 / 5,0 | 2,9 / 3,2 |
| Clientes, 10 por página | 4,4 / 4,8 | 4,2 / 5,7 | 4,3 / 4,5 | 2,8 / 3,1 |
| Cobros de 30 días | 4,5 / 5,2 | 4,6 / 5,8 | 4,5 / 4,6 ¹ | 4,7 / 5,3 |
| Cuadres | 3,9 / 4,1 | 4,1 / 4,5 | 4,0 / 4,1 | 4,0 / 4,3 |
| **20 estadísticas a la vez** | 2.484 / 2.556 | 2.451 / 2.562 | **365 / 395** | **9 / 32** |

¹ La primera corrida dio 12,2 / 13,4 ms con las cuatro versiones de la API arrancando a la vez; al
repetirla sola, 4,5 / 4,6 ms. Esta ruta no cambió en D-119.

## Resultados — conjunto B (×10)

| Lectura | Antes | D-117 | Optimizado | + caché |
| --- | ---: | ---: | ---: | ---: |
| Resumen | 422 / 452 | 493 / 618 | **59 / 63** | 3,0 / 3,4 |
| Estadísticas del mes | 610 / 775 | 665 / 742 | **93 / 109** | 2,9 / 3,2 |
| Estadísticas del año + período anterior | 1.716 / 1.737 | 1.797 / 1.891 | **650 / 692** | 3,2 / 3,9 |
| Mayor mora, página completa | — | 168 / 174 | **39 / 42** | 3,0 / 3,4 |
| Desempeño por cobrador, página | — | 490 / 550 | **58 / 67** | 3,0 / 3,2 |
| Desempeño de un cobrador | 180 / 207 | 192 / 225 | **30 / 33** | 2,8 / 2,9 |
| Préstamos, 10 por página | 5,5 / 7,7 | 6,0 / 7,4 | 5,7 / 6,0 | 2,7 / 3,0 |
| Clientes, 10 por página | 3,9 / 4,0 | 4,2 / 4,3 | 4,4 / 4,5 | 2,5 / 2,6 |
| Cobros desde 2023 (122.165 visitas) | 12,5 / 13,0 | 400 (rango > 93 días) | 400 | 400 |
| **20 estadísticas a la vez** | **55.574 / 57.476, 15 errores** | 58.283 / 63.588, 18 errores | **4.214 / 4.523, 0 errores** | **9,5 / 245, 0 errores** |

## Volumen y errores

- **Errores:** ninguna respuesta 5xx en ninguna serie, salvo los timeouts de «antes» y «D-117» con 20
  estadísticas a la vez en B (15 y 18 de 100: se agotaba el pool de conexiones de Prisma con miles
  de consultas en vuelo). Los 400 de la tabla son rechazos a propósito: página de más de 50 o rango
  de más de 93 días en el reporte de cobros (D-117).
- **Tamaño de respuesta:** la lista de préstamos crece de 5,7 KB a 6,1 KB por página de 10 porque cada
  fila trae `clientFullName`; a cambio, la web dejó de pedir una página de 100 clientes por pantalla
  (y la app móvil, un `GET /clients/:id` por cliente) solo para poner nombres.
- **Consultas por pantalla:** la foto de la cartera de las estadísticas pasaba por
  `GetLoanBalanceUseCase` y `ListCollectionAssignmentsUseCase` préstamo por préstamo (≈ 4 consultas
  por préstamo: en B, unas 2.000 para hoy y otras tantas para el período anterior, además de leer
  sus 5.954 préstamos). Con
  `ListLoanBalancesUseCase` son 2 consultas por tanda de 500 préstamos.

## Uso de la caché

- Medido con `INFO stats` de Redis durante una corrida completa del script en A: 368 aciertos y 426
  fallos de `GET`. Cada lectura hace dos `GET` (la generación del prestamista y la entrada); la
  generación «falla» mientras nadie ha escrito, así que la tasa útil se ve mejor en la latencia: de
  la segunda lectura en adelante, toda consulta cacheada responde en ~3 ms.
- **Memoria:** 10 entradas para todo el script, 2,2 MB de Redis en total (con las colas vacías). La
  entrada más grande es la lista de préstamos de 20 filas (12 KB); el tope por entrada es 256 KB.
- **Estampida:** sin `single-flight`, 20 lecturas iguales con la caché vacía calculaban 20 veces
  (p95 2,4 s en A); compartiendo el cálculo, 127 ms.

## D-122: estadísticas de períodos largos

Dos causas de los ~650 ms de «estadísticas del año + período anterior» en B, ya resueltas:

- **Desempeño por cobrador:** cada cobrador traía a memoria todas sus visitas del período con sus
  pagos (en B, ~40.000 por año) solo para contarlas y sumarlas. Ahora la base de datos devuelve el
  conteo y la suma (`summarizeByCollectorAndDateRange`): año sin período anterior 430 → 95 ms.
- **Período anterior:** traía los 5.954 préstamos y descartaba en memoria los que no estaban
  abiertos ese día. Ahora la consulta filtra por `createdAt` y `closedAt` (`openAt`).

| Lectura (B, sin caché) | Optimizado (D-119) | D-122 |
| --- | ---: | ---: |
| Estadísticas del año + período anterior | 650 / 692 | **171 / 187** |
| Estadísticas del mes | 93 / 109 | 93 / 135 |
| Desempeño por cobrador, página | 58 / 67 | 52 / 59 |
| 20 estadísticas a la vez | 4.214 / 4.523 | **2.985 / 3.546** |

## Qué queda por mirar

- **El cálculo ocupa el hilo de Node:** con caché vacía, 20 estadísticas a la vez en B tardan ~3 s
  sin errores (con caché, 9 ms). Si un negocio llega a ese tamaño, precalcular la foto diaria (job
  nocturno) es el siguiente paso, no más caché.
