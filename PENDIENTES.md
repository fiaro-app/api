# Pendientes de Fiaro

Estado al 2026-11-14. Lo hecho vive en `PRODUCT.md` y en el historial de PRs; aquí solo lo que falta.

## Decisión de arranque (2026-11-14)

El titular vende como **persona natural con su cédula**, sin empresa ni matrícula mercantil, y **no es responsable de IVA**: los precios no llevan IVA. Si el negocio funciona se registra (RUT con responsabilidades, matrícula mercantil o SAS). Con esa decisión:

- Los documentos legales de la web identifican al titular con `[NOMBRE COMPLETO, cédula n.º ____]`; se llena antes de cobrar.
- Si los ingresos pasan de 3.500 UVT al año o se crea una sociedad, cambia: IVA del 19%, factura electrónica y revisar precios.

## Antes de cobrar en producción

- [ ] **Nombre y cédula del titular** en los documentos legales (hoy son marcadores).
- [ ] **Contador (una sola consulta):** confirmar que no es responsable de IVA, qué documento de cobro debe dar a cada cliente (recibo o documento equivalente), si necesita RUT para operar con Wompi y cuándo le toca registrarse.
- [ ] **Abogado:** revisar Términos, Privacidad, Cookies, Suscripción, Devolución y PQR, incluida la decisión comercial del retracto (devolver en 5 días hábiles si no hubo uso) y si los prestamistas cuentan como «consumidores».
- [ ] **Wompi en producción.** Llaves de producción solo en los secretos del servidor, webhook público del api terminado en `/webhooks/wompi`, y rotar las llaves que se pegaron en chats. Falta probar el checkout en sandbox de punta a punta.
- [ ] **Registro de bases de datos (RNBD).** Preguntar al abogado si aplica a una persona natural con pocos datos.

## Para salir al aire

- [ ] **Dónde se despliega** el api, el web y las bases (Postgres, Redis, Mongo, almacenamiento), con dominio y HTTPS.
- [ ] **Correo real en producción:** hoy los correos van a Mailpit local. Ahora que el correo es obligatorio y sirve para entrar, hace falta un proveedor de envío (con dominio verificado) para los códigos de verificación y de recuperación.
- [ ] **Almacenamiento del logo en producción** (bucket y su origen público en `STORAGE_ORIGIN` del web).
- [ ] **Turnstile** con llaves de producción.
- [ ] **Copias de seguridad** de Postgres y Mongo, y avisos si algo falla (errores y caídas).
- [ ] **App móvil:** cuenta de desarrollador de Apple y de Google, compilación con EAS, fichas de las tiendas, política de privacidad enlazada y formularios de seguridad de datos.
- [ ] **Cuentas viejas sin correo:** ya se les pide al entrar; verificarlo en el simulador y en la web con una cuenta real.

## Producto

- [ ] **Importar desde Excel en mobile.** API (D-152) y web (W-107) ya están; falta la pantalla del celular.
- [ ] **Plan Team:** soporte prioritario y consolidados entre negocios.
- [ ] **Devoluciones desde el panel.** Hoy un reembolso se hace a mano en Wompi y se corrige a mano el plan.
- [ ] **Aislamiento por negocio en la base (RLS):** aplazado a propósito, queda como endurecimiento antes de crecer.

## Diseño

- [ ] **Mock de Penpot** del home nuevo y de los paneles (Penpot estaba desconectado).
- [ ] **Favicon:** `web/src/app/favicon.ico` parece el de la plantilla de Next.js; reemplazarlo por el de Fiaro.
- [ ] **Licencias de mobile:** repetir la revisión de fuentes e iconos (la de web está en `web/THIRD_PARTY.md`).

## Operación

- [ ] **Test `billing-history.e2e-spec.ts` (recordatorios).** Falló una vez en CI cerca de la medianoche de Colombia; revisar si depende de la hora.
- [ ] **Postman.** La app de Postman vació `postman/postman/` una vez; revisar su vínculo con `api/postman`.
- [ ] **Dependabot en web.** Cinco PRs de acciones de CI con el CI fallando.
