# Códigos de error y rastreo del flujo

Dos mecanismos para depurar producción sin filtrar nada a un atacante (D-134, D-135).

## Código único de error

Cada error de la API lleva `errorCode`, con formato `^[A-Z]\d{3}[A-Z]$`: **área** (letra) + **número** (3 dígitos) + **origen** (letra). Ejemplo: `L003A` = préstamo no encontrado (L = préstamos, A = regla de negocio).

| Área | Módulo | | Origen | Quién lo causó |
|---|---|---|---|---|
| A | auth | | A | regla de negocio |
| C | clients | | V | validación de entrada |
| L | loans | | D | base de datos (Postgres) |
| V | collections | | R | Redis |
| S | settlements | | M | Mongo |
| M | memberships | | S | almacenamiento (S3/R2) |
| B | lenders | | E | correo (Resend) |
| N | notifications | | X | push (Expo) |
| T | tenants | | F | Cloudflare (Turnstile) |
| G | leads | | H | borde HTTP (ruta, JSON, tamaño) |
| U | subscription | | U | desconocido |
| W | system | | | |
| P | plataforma | | | |

- **Siempre visible** (también en producción): `errorCode` y `requestId` en el cuerpo del error. Las apps deciden qué mostrar con `errorCode`; `code` (p. ej. `NOT_FOUND`) sigue existiendo.
- **Nunca en producción**: `debug { title, hint, cause }` (qué significa, qué mirar, la causa truncada). Solo aparece en desarrollo/pruebas.
- **Siempre en los logs** (también producción): `errorCode`, `errorTitle`, `errorHint`, `errorCause` en la línea del request.
- Fallos de proveedores (Prisma, Redis, Mongo, S3, Resend, Expo) se clasifican por el nombre de la clase del error: `P910D`, `P911R`, `P912M`, `P913S`, `P914E`, `P915X`; lo no reconocido es `P900U`.
- El catálogo es `src/shared/domain/errors/error-catalog.json`; una prueba exige que todo `DomainError` tenga código único y entrada.

## Rastreo del flujo (Grafana/Loki)

Cada línea de log del request lleva `requestId`, `traceId`, `spanId`, y si el cliente los manda, `sessionId` y `screen`. Cabeceras del cliente (todas opcionales, validadas con lista estricta; lo que no cumpla se descarta):

| Cabecera | Valor |
|---|---|
| `X-Session-Id` | UUID generado una vez por arranque de la app |
| `X-Client-Screen` | plantilla de la ruta (`/loans/[id]`), nunca la URL con ids |
| `traceparent` | W3C Trace Context |

La respuesta devuelve `X-Request-Id`. Para ver el recorrido de una persona: `{app="fiaro-api"} | json | sessionId="<uuid>"` ordenado por tiempo; para un fallo concreto, buscar por `requestId` (el que ve el cliente) o `errorCode`.
