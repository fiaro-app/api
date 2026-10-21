# Plan: cobro de la suscripción con Wompi

> Borrador para revisar (2026-10-16). Nada de esto está programado. Cuando se apruebe pasa a `PRODUCT.md` como decisión (D-149 o la que toque) y se parte en PRs. Los datos de Wompi salen de su documentación pública (docs.wompi.co); lo marcado «verificar» hay que confirmarlo con Wompi o en su panel antes de programar.

## 1. Qué se cobra y qué no

- Se cobra **solo la suscripción de Fiaro** (Individual 49 000, Pro 69 000, Team 149 000 COP al mes; D-144). Fiaro nunca toca el dinero de los préstamos (`fiaro-never-touches-loan-money`).
- El cliente final de Wompi es **la dueña del negocio** (rol `OWNER`); los demás roles ven el plan pero no pagan.
- Moneda COP; Wompi trabaja en centavos (`amount_in_cents` = precio × 100).

## 2. Opciones y recomendación

| | A. Pago por período (Web Checkout) | B. Cobro automático (fuente de pago) |
|---|---|---|
| Cómo | La dueña paga en la página de Wompi (tarjeta, PSE, Nequi, Bancolombia) cada vez que renueva | Se guarda una fuente de pago (tarjeta, Nequi, Bancolombia) y Fiaro cobra sola cada mes |
| Esfuerzo | Medio: una orden, una firma y un webhook | Alto: tokenización, aceptación de términos, cobros programados, reintentos, cancelar |
| Riesgo | Bajo; PSE solo funciona así | Más piezas y más reglas (consentimiento, fallos de cobro) |
| Encaja con lo que dijiste | Sí («PSE o a mano», Wompi) | Después |

**Recomendación:** empezar con **A** (v1) y dejar **B** como v2 para tarjeta y Nequi. A ya cubre PSE, que B no cubre, y deja el modelo de datos listo para B.

## 3. Flujo de la v1 (A)

1. La dueña abre «Plan y pagos» en la web, elige plan y meses (1, 3, 6 o 12; sin descuentos al inicio) y pulsa «Pagar».
2. `POST /subscription/checkout { planCode, months }` (solo `OWNER`; permitido aunque el negocio esté en solo lectura: es la forma de salir de él, `@AllowWhenReadOnly()`):
   - toma el **precio del catálogo del servidor** (nunca del cliente) y crea una orden `PENDING` con una `reference` única;
   - responde lo que la web necesita para ir a Wompi: `public-key`, `currency=COP`, `amount-in-cents`, `reference`, `signature:integrity` = `SHA256(reference + amount + currency + integritySecret)` (el secreto nunca sale del servidor) y `redirect-url`.
3. La web manda a la dueña a `https://checkout.wompi.co/p/` con esos datos. Paga allí.
4. Wompi vuelve a `redirect-url?id=…`. Esa página **solo informa** («estamos confirmando tu pago…» y consulta `GET /subscription/checkout/:reference` hasta que cambie): la redirección no prueba nada.
5. La verdad llega por el **webhook** (sección 4). Al aprobarse, la suscripción pasa al plan comprado y el vencimiento se extiende.

## 4. Webhook `POST /webhooks/wompi`

- Ruta `@Public()` (sin sesión) y fuera del CORS/Origin de las apps; con el rate limit general.
- Se valida el **checksum** antes de hacer nada: concatenar los valores de `signature.properties` (en ese orden, leídos de `data`), el `timestamp` y el **secreto de eventos**, aplicar SHA-256 en hexadecimal y comparar en tiempo constante con `X-Event-Checksum`. Las propiedades se leen del propio evento, no se fijan en el código (Wompi dice que pueden cambiar). Firma inválida: 401 y se registra, sin tocar nada.
- Solo se procesa `transaction.updated`. Se busca la orden por `reference`; se comprueban **monto y moneda** contra la orden (si no coinciden: se registra y no se aplica).
- **Idempotente:** Wompi reintenta si no recibe 200 (a los 30 min, 3 h y 24 h) y puede mandar el mismo evento dos veces. Se aplica una sola vez con una transacción de Postgres, el candado por orden y una restricción única sobre el id de la transacción de Wompi.
- Estados: `APPROVED` aplica el pago; `DECLINED`, `VOIDED` y `ERROR` solo cierran la orden y avisan. Un evento de una referencia desconocida responde 200 (para que Wompi no reintente) y se registra.
- Siempre 200 cuando la firma es válida, aunque el negocio ya esté al día; el cuerpo de la respuesta no importa.

## 5. Qué hace «aprobado»

Regla simple, en una transacción:

- `nuevoVencimiento = max(ahora, vencimientoActual) + meses`. No se pierden los días que ya estaban pagados (ni los de la prueba).
- Se aplica el plan comprado (`planCode` y sus topes copiados del `PLAN_CATALOG`, como en D-144).
- **Subir de plan** vale desde ya; **bajar** de plan también (no se borra nada: si el negocio queda por encima de un tope, solo se bloquea crear más, ya decidido).
- Al salir de `READ_ONLY`, el negocio vuelve a escribir en el acto (el guard lee la fecha).
- Se registra en la auditoría (`billing.payment_approved`) y se manda un correo de confirmación a la dueña.

## 6. Datos nuevos

- Tabla `subscription_payments`: `id`, `tenantId`, `planCode`, `months`, `amountInCents`, `currency`, `reference` (única), `status` (`PENDING | APPROVED | DECLINED | VOIDED | ERROR`), `wompiTransactionId` (único, nulo hasta que llega), `paymentMethodType`, `createdAt`, `resolvedAt`, `periodStart`, `periodEnd`.
- Variables de entorno (nunca en el repo ni en logs): `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_CHECKOUT_REDIRECT_URL`, y `WOMPI_PRIVATE_KEY` solo cuando exista la v2. Llaves `pub_test_…` en desarrollo y CI, `pub_prod_…` en producción; Wompi da URLs de eventos separadas para cada entorno.
- Contratos: esquemas de la orden y del historial en `@fiaro-app/contracts` (versión menor nueva) para web y móvil.

## 7. Rutas

| Ruta | Quién | Para qué |
|---|---|---|
| `POST /subscription/checkout` | `OWNER` | crea la orden y devuelve los datos del checkout |
| `GET /subscription/checkout/:reference` | `OWNER` | estado de una orden (la página de retorno) |
| `GET /subscription/payments` | `OWNER` | historial de pagos |
| `POST /webhooks/wompi` | Wompi | confirmar el pago |

Todas con su Postman en el mismo PR (regla del proyecto).

## 8. Recordatorios y vencimiento

- Aviso por correo y por notificación (push) a la dueña a los **7, 3 y 1 días** antes de vencer, el día del vencimiento y en cada día de gracia; reutiliza el planificador del aviso de mora (`MoraAlertScheduler`, D-96) y los canales de D-94 y D-95.
- La web y el móvil ya muestran el aviso (web#80, mobile#53); suman el botón «Renovar».
- **Móvil:** solo informa y manda a la web («Renovar en la web»). No se vende nada dentro de la app, para no entrar en las reglas de compras de las tiendas.

## 9. Web (v1)

Pantalla «Plan y pagos»: plan actual y vencimiento, selector de plan y meses con el total, botón «Pagar con Wompi», página de retorno con el estado, e historial. Permitida en solo lectura.

## 10. Seguridad

- Montos y precios solo del servidor; el cliente manda `planCode` y `months`.
- Secretos solo en variables de entorno; el de integridad y el de eventos nunca llegan a la web ni a los logs (ya hay redacción de logs con Pino).
- Webhook con checksum, comparación en tiempo constante, idempotencia y control de monto.
- Toda orden y todo evento queda en la auditoría de Mongo (D-… `audit_events`).
- Pruebas: unitarias de la firma y del checksum, e2e con eventos firmados con un secreto de prueba (aprobado, rechazado, repetido, monto distinto, firma mala, referencia desconocida) y la salida de `READ_ONLY` al pagar.

## 11. Orden de trabajo (PRs)

1. **api:** tabla, `POST /subscription/checkout`, webhook, aplicar el pago, auditoría, Postman, D-149. (Sandbox de Wompi.)
2. **contracts:** esquemas de orden e historial → versión menor.
3. **api (hecho, D-150):** historial, comprobante por correo y recordatorios.
4. **web:** «Plan y pagos» y la página de retorno.
5. **mobile:** botón «Renovar en la web».
6. **v2 (después):** cobro automático con fuente de pago para tarjeta y Nequi.

## 12. Lo que necesito de ti o hay que decidir

1. **Cuenta de Wompi:** crear la cuenta de comercio (hay que tener RUT y datos del negocio; la producción exige que Wompi la apruebe). Para empezar bastan las **llaves de sandbox**: pública, secreto de integridad y secreto de eventos. Las pones tú en el `.env`; yo nunca las veo.
2. **IVA y factura electrónica (importante):** los servicios de software en Colombia suelen llevar IVA y exigen factura electrónica a la DIAN. Wompi **no** emite esa factura. Hay que definir con un contador si los precios (49/69/149 mil) ya incluyen IVA, y cómo se factura. No es una decisión técnica y puede cambiar los precios.
3. **Comisión de Wompi:** verificar la tarifa vigente de tarjeta, PSE y Nequi; cambia el margen sobre todo del plan de 49 000.
4. **Meses por pago:** ¿solo mensual al inicio, o también 3, 6 y 12? (recomiendo solo mensual en la v1 y descuentos después).
5. **Trial → plan de pago:** ¿al pagar se conservan los días que quedaban de la prueba? (el plan lo hace; es generoso pero simple).
6. **Reembolsos:** política (por ejemplo, ninguno después de 7 días). Se hacen a mano desde el panel de Wompi; la API recibiría el evento `VOIDED`.
7. **Quién cobra la primera vez:** hasta que exista Wompi en producción, renovar sigue siendo mover `current_period_ends_at` a mano.
