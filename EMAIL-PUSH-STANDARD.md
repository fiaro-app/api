# Estándar de correos y notificaciones push (D-131)

Cómo se escriben los correos y los push de Fiaro para que lleguen a la bandeja principal (no a spam)
y se lean bien. Lo que se puede comprobar con código **lo comprueban las pruebas**
(`src/shared/domain/email/email-standard.spec.ts`, `src/modules/notifications/domain/push-standard.spec.ts`):
si alguien agrega un correo y rompe el estándar, el CI falla. Lo que depende del DNS o del proveedor
está en «Pendiente de infraestructura».

Fuentes: pautas de Gmail para remitentes (<https://support.google.com/a/answer/81126>, revisadas el
2026-10-15) y las recomendaciones de entregabilidad de Resend.

## 1. Lo que Google exige y recomienda

**Todos los remitentes (desde febrero de 2024):** SPF **o** DKIM en cada dominio, DNS inverso (PTR) válido,
TLS, tasa de spam en Postmaster Tools por debajo de 0,3 %, formato RFC 5322 y no suplantar cabeceras
`From:` de Gmail.

**Remitentes masivos (más de 5.000 al día):** SPF **y** DKIM, DMARC publicado (la política puede ser `none`),
el dominio del `From:` alineado con el de SPF o DKIM, y baja con un clic (cabeceras `List-Unsubscribe` y
`List-Unsubscribe-Post`) más un enlace visible en el cuerpo para mensajes de marketing o suscripción.

**Recomendaciones:** DKIM de 2048 bits, tasa de spam bajo 0,10 %, HTML válido, un solo remitente en
`From:`, `Message-ID` válido, asuntos y nombres que no engañen (nada de «Re:» falso), no ocultar contenido
con CSS, enlaces visibles y claros, no usar emojis para imitar gráficos o verificación, no mezclar tipos de
contenido (promociones dentro de un correo transaccional), un remitente consistente por categoría y volumen
estable sin ráfagas.

Resend añade: enviar desde un **subdominio** (`mail.tu-dominio.com`) para proteger la reputación del dominio
principal, incluir siempre texto plano, usar un dominio propio para el seguimiento de enlaces, enlaces que
coincidan con el dominio remitente, cuerpo por debajo de 102 KB (Gmail recorta lo que pasa de ahí) y evitar
direcciones `no-reply`.

## 2. Reglas de Fiaro para cada correo (las aplica `renderEmail`)

| Regla | Por qué | Dónde se comprueba |
| --- | --- | --- |
| Todo correo sale de `renderEmail` (`src/shared/domain/email/email-layout.ts`); nunca HTML a mano | Un solo diseño, un solo lugar donde escapar el texto | revisión + `email-standard.spec.ts` |
| Asunto: `Fiaro: <frase corta>`, una línea, **≤ 60 caracteres**, sin `!`, sin MAYÚSCULAS sostenidas ni «GRATIS»/«URGENTE» | Los filtros penalizan el tono de spam; los clientes cortan el asunto largo; una línea evita inyección de cabeceras | `emailSubject` + spec |
| HTML en una tabla de 600 px con **estilos en línea**, `lang="es"`, `meta viewport` | Los clientes de correo ignoran las hojas de estilo; se ve bien en el teléfono | spec |
| Sin `<script>`, `<form>`, `<iframe>`, `<img>`, `<input>`, `<video>` | Se bloquean o suben el puntaje de spam | spec |
| **Sin imágenes ni píxeles de seguimiento** (el logo es la palabra «Fiaro» en texto) | Nada remoto que bloquear; el correo pesa unos 3 KB | spec |
| Texto plano equivalente, sin etiquetas, que termina en «— Fiaro» | Gmail y Resend lo piden; lo usan los lectores de pantalla y relojes | spec |
| HTML por debajo de 30 KB (límite de Gmail: 102 KB) | Evita el recorte «Ver mensaje completo» | spec |
| Un solo enlace posible (el botón) y siempre `https://` | Enlaces claros; `http` o esquemas raros penalizan | `renderEmail` lanza `RangeError` |
| Todo texto de una persona se escapa (`escapeHtml`) | Evita inyección de HTML en un correo «oficial» | spec |
| Preheader (texto que aparece junto al asunto) en cada correo | Se entiende sin abrirlo | `EmailSpec.preheader` |
| Cada correo explica por qué llegó o qué hacer si no fue la persona (`footnote`) | Menos reportes de spam, más confianza | revisión |
| Un solo propósito por correo; sin promociones dentro de uno transaccional | Gmail no quiere mezclas | revisión |

### Colores y tipografía

Fondo **blanco**, texto **#1c1b2e** (contraste 16:1 con blanco), gris **#5b5870** para lo secundario (6:1) y el
índigo de la marca **#3b3382** solo como acento (la línea bajo el nombre y el botón; texto blanco sobre él da
9:1). Fuente del sistema (`-apple-system, Segoe UI, Roboto, Helvetica, Arial`). Todos cumplen WCAG AA. No
se usan rojos agresivos, degradados ni fondos oscuros: el fondo claro evita que el modo oscuro de los
clientes invierta colores y rompa el contraste (`color-scheme: light`). Las constantes están en
`EMAIL_COLORS`.

### Cómo agregar un correo nuevo

1. Escribe una función pura `xxxEmail(...)` que llame `renderEmail({ title, preheader, paragraphs, highlight?, button?, footnote? })`.
2. Agrégala a `EMAILS` en `email-standard.spec.ts`: ahí se revisa el estándar completo.
3. Si es **de marketing o de suscripción** (hoy no hay ninguno), antes de enviarlo agrega las cabeceras
   `List-Unsubscribe` / `List-Unsubscribe-Post` con una ruta que atienda la baja con un clic.

## 3. Push (las aplica `pushMessageFor`)

| Regla | Valor | Por qué |
| --- | --- | --- |
| Título | **≤ 50 caracteres**, una línea, frase corta sin mayúsculas sostenidas ni emojis | iOS y Android cortan hacia los 40-50 |
| Texto | **≤ 140 caracteres**, una línea | se lee completo en 2-3 líneas |
| Datos (`data`) | **solo identificadores** (`notificationId`, `relatedEntityType`, `relatedEntityId`) | el payload pasa por Expo y APNs/FCM: nada de nombres, montos ni textos |
| Prioridad | `high` para `ALERT` y `WARNING`; `default` para `INFO` y `SUCCESS` | la alta despierta el teléfono: se reserva a lo que pide atención ya |
| Vigencia (`ttl`) | 12 h | lo operativo de ayer no sirve hoy |
| Canal Android | `default` (lo crea la app móvil) | agrupa los avisos bajo «Avisos» |
| Sonido | `default` | |
| Mismo texto que el feed y el correo | recortado al estándar | los tres canales dicen lo mismo |

Qué va por push y qué por correo (D-125): el **push va siempre**; el correo solo para `ALERT` (o `WARNING`
cuando la persona no tiene celular registrado). El texto de los push se escribe en la notificación del
feed y se recorta aquí: escribe títulos y textos cortos desde el origen.

## 4. Pendiente de infraestructura (no se resuelve con código)

Estas piezas dependen del DNS y del proveedor. Hasta que estén, los correos pueden caer en spam aunque el
HTML sea perfecto:

1. **Dominio remitente verificado en Resend**, de preferencia un subdominio (`mail.fiaro.co`).
2. **SPF** del subdominio con `include:` de Resend y **DKIM** (Resend entrega los registros; usa 2048 bits).
3. **DMARC** publicado en el dominio (`_dmarc`), empezando en `p=none` con reportes (`rua=`) y subiendo a
   `quarantine` cuando los reportes salgan limpios; el `From:` debe estar alineado con SPF o DKIM.
4. **Google Postmaster Tools** con el dominio verificado, para vigilar reputación y tasa de spam (< 0,10 %).
5. **Reply-To real** (no `no-reply@`): hoy `RESEND_FROM_EMAIL` se usa como remitente; falta una variable
   para `Reply-To` si el remitente es de solo envío.
6. **Seguimiento de enlaces/aperturas apagado** en Resend (los correos de Fiaro no lo necesitan) o con
   dominio propio.
7. Si algún día se envían correos de marketing: baja con un clic y dominio/subdominio separado del
   transaccional.

## 5. Cómo revisar un correo a mano

Con `pnpm docker:infra`, los correos van a Mailpit (<http://localhost:8025>): la pestaña **HTML Check**
compara el HTML con lo que soportan los clientes de correo, **Link Check** revisa los enlaces y
**Spam Analysis** da un puntaje de SpamAssassin. Un correo de Fiaro debe salir sin avisos en los tres.
