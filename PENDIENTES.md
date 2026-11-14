# Pendientes de Fiaro

Estado al 2026-11-13. Lo hecho vive en `PRODUCT.md` y en el historial de PRs; aquí solo lo que falta.

## Antes de cobrar en producción

- [ ] **Datos de la empresa.** Razón social, NIT y domicilio: los documentos legales de la web llevan el marcador `[RAZÓN SOCIAL, NIT Y DOMICILIO DE FIARO — pendiente]`. Mientras no exista RUT no se puede cobrar IVA ni emitir factura.
- [ ] **Contador.** Confirmar que el IVA (19%, precios con IVA incluido) aplica, si Fiaro es responsable de IVA y cómo se declara.
- [ ] **Factura electrónica DIAN.** Hoy solo se envía un recibo por correo (D-150). Falta habilitar facturación electrónica y emitir una por cada pago aprobado.
- [ ] **Abogado.** Revisar Términos, Privacidad, Cookies, Condiciones de Suscripción, Devolución de Dinero y PQR. Incluye la decisión comercial del retracto (devolver en 5 días hábiles si no hubo uso) y si los prestamistas cuentan como «consumidores».
- [ ] **Wompi en producción.** Llaves de producción solo en los secretos del servidor, webhook público del api terminado en `/webhooks/wompi` y rotar las llaves que se pegaron en chats.
- [ ] **Registro de bases de datos (RNBD).** Evaluar con el abogado si Fiaro debe inscribir sus bases en el Registro Nacional de Bases de Datos de la SIC.

## Producto

- [ ] **Importar desde Excel en mobile.** API (D-152) y web (W-107) ya están; falta la pantalla del celular.
- [ ] **Fase 4 de funciones por plan.** Soporte prioritario del plan Team y consolidados entre negocios.
- [ ] **Devoluciones desde el panel.** Hoy un reembolso se hace a mano en Wompi y se corrige a mano el plan.
- [ ] **Pantallas de Penpot de mobile** sin actualizar tras los últimos cambios.

## Operación

- [ ] **Test `billing-history.e2e-spec.ts` (recordatorios, D-150).** Falló una vez en CI cerca de la medianoche de Colombia; revisar si depende de la hora.
- [ ] **Postman.** La app de Postman vació `postman/postman/` una vez; revisar su vínculo con `api/postman`.
- [ ] **Dependabot en web.** Cinco PRs de acciones de CI con el CI fallando.
- [ ] **Desplegar.** Elegir dónde corre el api, el web y las bases en producción.
