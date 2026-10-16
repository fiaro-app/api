# Documentación legal de Fiaro (borrador para revisión de un abogado)

> **Aviso.** Este documento y los textos de la web (`/terminos`, `/privacidad`, `/cookies`) son un **borrador técnico-jurídico** armado con la
> normativa colombiana que se pudo verificar. **No es asesoría legal.** Antes de lanzar con clientes reales, un abogado colombiano
> con experiencia en protección de datos y servicios financieros debe revisarlos. Las normas marcadas con (*) las verificó la
> búsqueda del 2026-10-16; las demás vienen de conocimiento general y hay que confirmarlas.

## 1. Qué es Fiaro, jurídicamente

Fiaro es un **software de gestión** (SaaS) para prestamistas informales. **No presta dinero, no cobra, no fija intereses, no
recibe pagos de los deudores ni intermedia dinero** (PRODUCT.md §5-6, D-136): solo registra lo que el prestamista hace. Esa frontera
es la base de casi todo lo demás: Fiaro no es entidad vigilada por la Superfinanciera ni entidad de crédito, y los términos lo dicen.

## 2. Los roles que fija la Ley 1581 de 2012 (*)

| Datos | Quién es el **Responsable** | Quién es el **Encargado** |
| --- | --- | --- |
| Cuenta del prestamista y de sus cobradores (nombre, celular, cédula, correo) | **Fiaro** | — |
| Clientes del prestamista (nombre, cédula, celular, dirección, foto, historial de pagos, riesgo) | **El prestamista** | **Fiaro** (trata los datos por cuenta de él) |

Consecuencias, ya reflejadas en los textos:

- El prestamista **se compromete** (casilla `acceptedDataResponsibility`) a tener la autorización de sus clientes y a informarles su
  política de datos. Fiaro **no** habla con los clientes finales ni les pide autorización.
- Fiaro trata los datos de los clientes **solo para prestar el servicio** y no los vende ni los usa para otra finalidad.
- Entre Fiaro y el prestamista hay una **transmisión de datos** (Decreto 1377 de 2013 (*), compilado en el Decreto 1074 de 2015): los
  Términos hacen de contrato de transmisión. El abogado debe confirmar que el contenido mínimo está completo.

## 3. Lo que se implementó

| Requisito | Dónde |
| --- | --- |
| Autorización previa, expresa e informada para el tratamiento de datos (Ley 1581, art. 9) | Casilla `acceptedPrivacy` al registrarse, con enlace a la política |
| Política de Tratamiento de la Información y aviso de privacidad (Decreto 1377) | `/privacidad` (web) y enlace en el registro de web y móvil |
| Derechos del titular: conocer, actualizar, rectificar, suprimir, revocar, quejas ante la SIC | Sección de derechos en `/privacidad`, con canal `/contacto` |
| Prueba de la autorización (Ley 527 de 1999: mensaje de datos con valor probatorio) | Tabla `legal_acceptances`: documento, versión, fecha, IP, dispositivo (D-146) |
| Versionado de los textos | `CURRENT_LEGAL_VERSION`; una versión vieja se rechaza con `P930V` |
| Cookies (la SIC las trata como medio de recolección de datos personales (*)) | `/cookies`: solo cookies estrictamente necesarias (sesión y antirrobo); aviso informativo en la web |
| Límite de responsabilidad, uso aceptable, suspensión, ley aplicable | `/terminos` |
| Autorización de comunicaciones comerciales | Casilla opcional `marketingConsent`, nunca condiciona el registro |

## 4. Obligaciones del **prestamista** que los Términos le trasladan

Fiaro no puede garantizar que el prestamista cumpla la ley, pero sí puede **exigirle por contrato** (y dejar prueba de su aceptación):

1. **Cobranza (Ley 2300 de 2023, «Dejen de fregar») (*).** Horarios de contacto (lunes a viernes 7 a. m. a 7 p. m.; sábado 8 a. m. a
   3 p. m.; sin domingos ni festivos, según las fuentes consultadas), frecuencia máxima de contactos y prohibición de contactar a
   terceros o referencias. **El abogado debe confirmar el alcance exacto y si aplica a prestamistas no vigilados.**
2. **Usura.** Cobrar por encima de la tasa de usura certificada por la Superfinanciera es delito (Código Penal, art. 305; no verificado
   en esta sesión). Fiaro no fija tasas; los Términos prohíben usarlo para créditos usureros y el prestamista responde.
3. **Habeas data financiero (Ley 1266 de 2008 y Ley 2157 de 2021, no verificadas).** Fiaro **no reporta a centrales de riesgo**.
   El puntaje de riesgo es una ayuda interna del prestamista, no un reporte crediticio. El prestamista no debe reportar a centrales
   de riesgo sin ser fuente autorizada.
4. **Datos sensibles.** La foto de un cliente puede ser dato biométrico si se usa para identificarlo, y el tratamiento de datos
   sensibles exige autorización **explícita** y que el titular sepa que no está obligado a darla (Ley 1581, art. 6 (*), y Decreto 1377 (*)).
   Por eso la foto del cliente es opcional, privada, y la **cédula no se fotografía** (D-145).
5. **Lícito origen y finalidad.** No usar Fiaro para actividades ilícitas (lavado, extorsión, cobro de deudas inexistentes).

## 5. Pendientes que NO se pueden resolver en código (hay que decidirlos con un abogado o con el titular del negocio)

- [ ] **Razón social, NIT, domicilio y correo oficial de Fiaro.** Los textos hoy se refieren a «Fiaro» y al canal `/contacto`; hay que poner
  los datos reales cuando exista la sociedad (o se defina si opera como persona natural).
- [ ] **Registro Nacional de Bases de Datos (RNBD).** Obliga a sociedades con activos totales superiores a 100.000 UVT (Decreto 090 de
  2018 (*)). Una startup pequeña probablemente **no** está obligada hoy; recalcular al crecer. Las personas naturales están excluidas.
- [ ] **Oficial de protección de datos / área responsable** y un correo para ejercer derechos (la ley exige designar quién atiende).
- [ ] **Transferencia internacional de datos.** Fiaro usa proveedores que pueden estar fuera de Colombia (alojamiento, base de datos,
  cola/caché, almacenamiento de archivos, correo, Cloudflare Turnstile). Hay que listarlos, verificar que el país ofrezca nivel adecuado
  o contar con la autorización/declaración que exige la SIC, y dejarlo escrito en la política.
- [ ] **Tiempo de conservación.** La política dice cuánto se conservan los datos tras cerrar la cuenta; el abogado debe validar los plazos
  (por ejemplo, evidencia de autorizaciones y obligaciones contables).
- [ ] **Retracto (Ley 1480 de 2011, art. 47 (*)).** Aplica a ventas a distancia a **consumidores**: cinco días hábiles, salvo servicios
  ya iniciados. Los planes de pago de Fiaro son B2B, pero un prestamista informal persona natural podría invocarlo; definir la política
  cuando exista el cobro de suscripciones.
- [ ] **Ley aplicable y fuero.** Los Términos eligen la ley colombiana y los jueces de la ciudad del domicilio de Fiaro (a completar).
- [ ] **Edad.** El servicio es para mayores de 18 años; un menor no puede ser prestamista ni cobrador.
- [ ] **Revocatoria y supresión.** Hoy se atienden por `/contacto`; falta un flujo propio en la app (borrado de la cuenta y de los datos de
  clientes a solicitud del prestamista) y definir qué se conserva por obligación legal.

## 6. Qué cambia en el producto cuando se actualice un texto

1. Cambiar el texto en la web (`web/src/content/legal.ts`).
2. Subir `CURRENT_LEGAL_VERSION` en `api/src/modules/legal/domain/legal-document.ts` y `LEGAL_VERSION` en web y móvil.
3. Quienes ya están registrados siguen con la versión que aceptaron (la tabla guarda cuál). Si el cambio es sustancial, falta construir la
   re-aceptación al iniciar sesión (no está hecha).
