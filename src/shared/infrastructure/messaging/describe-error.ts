/**
 * El texto con el que un error de conexión queda en el log.
 *
 * @remarks
 * Cuando un nombre resuelve a varias direcciones (`localhost` es `::1` y `127.0.0.1`), Node agrupa
 * los intentos fallidos en un `AggregateError` cuyo `message` viene vacío: el motivo está en cada
 * error interno y en el `code`. Sin esto, el aviso de un Redis caído sería una línea sin causa.
 *
 * @param error - El error de la conexión.
 * @returns Su mensaje; si viene vacío, el de sus errores internos, su `code` o su nombre.
 */
export function describeConnectionError(error: Error): string {
  if (error.message !== '') {
    return error.message;
  }
  const causes =
    error instanceof AggregateError
      ? error.errors.map((cause: unknown) =>
          cause instanceof Error ? cause.message : String(cause),
        )
      : [];
  if (causes.length > 0) {
    return causes.join('; ');
  }
  const { code } = error as NodeJS.ErrnoException;
  return code ?? error.name;
}
