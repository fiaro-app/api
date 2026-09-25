import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Dirección donde escuchan las aplicaciones de las pruebas. */
const LOOPBACK = '127.0.0.1';

/** Cuántos puertos se prueban antes de rendirse. */
const MAX_ATTEMPTS = 20;

/** El servidor HTTP de la app, ya como `http.Server` (Nest lo tipa como `any`). */
const serverOf = (app: INestApplication): Server =>
  app.getHttpServer() as Server;

/** Intenta escuchar en un puerto libre; rechaza con el error de `listen` (por ejemplo `EADDRINUSE`). */
function listenOnce(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, LOOPBACK, () => {
      server.off('error', reject);
      resolve((server.address() as AddressInfo).port);
    });
  });
}

/**
 * Pone a escuchar la aplicación de pruebas en `127.0.0.1`, en un puerto libre, y devuelve el puerto.
 *
 * @remarks
 * Sin esto, supertest hace `listen(0)` en cada petición y Node escucha en la dirección comodín
 * (`::`). En macOS otra aplicación puede escuchar en `127.0.0.1` en ese mismo puerto (Postman,
 * VS Code, DBeaver y Redis Insight abren puertos en el rango efímero) y el sistema entrega la
 * conexión al más específico: la petición de la prueba la contesta la otra aplicación (un 404 vacío,
 * `socket hang up` o `Parse Error: Expected HTTP/`) y la prueba falla al azar, más seguido con más
 * pruebas. Escuchando en `127.0.0.1` ese puerto ya está ocupado para nosotros (`EADDRINUSE`) y se
 * prueba con el siguiente. Una app que ya escucha no la cierra supertest: la cierra `app.close()`.
 *
 * @param app - La aplicación, ya inicializada.
 * @returns El puerto en el que escucha.
 */
export async function listenOnLoopback(app: INestApplication): Promise<number> {
  const server = serverOf(app);
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await listenOnce(server);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EADDRINUSE' || attempt >= MAX_ATTEMPTS) {
        throw error;
      }
    }
  }
}
