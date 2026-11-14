/** Lo que la web necesita para mandar a la dueña a pagar en la página de Wompi. */
export interface CheckoutParams {
  /** Dirección de la página de pago. */
  readonly url: string;
  readonly publicKey: string;
  readonly currency: string;
  readonly amountInCents: number;
  readonly reference: string;
  /** Firma de integridad (`signature:integrity`): prueba que el monto no se cambió en el navegador. */
  readonly signatureIntegrity: string;
  /** A dónde vuelve la persona después de pagar. */
  readonly redirectUrl: string;
}

/** El aviso `transaction.updated` de Wompi, ya con su firma comprobada. */
export interface PaymentEvent {
  readonly reference: string;
  readonly wompiTransactionId: string;
  /** El estado que reporta Wompi: `APPROVED`, `DECLINED`, `VOIDED`, `ERROR`… */
  readonly status: string;
  readonly amountInCents: number;
  readonly currency: string;
  readonly paymentMethodType: string | null;
}

/** El resultado de leer un aviso de Wompi. */
export type ParsedEvent =
  /** La firma no coincide o el aviso no tiene la forma esperada. */
  | { readonly kind: 'invalid' }
  /** Aviso auténtico de otro tipo (un token de Nequi, por ejemplo): se ignora. */
  | { readonly kind: 'ignored' }
  | { readonly kind: 'transaction'; readonly event: PaymentEvent };

/** La pasarela de pagos (Wompi): firma las órdenes y comprueba sus avisos. */
export interface PaymentGateway {
  /** Si están configuradas las llaves; sin ellas no se puede cobrar. */
  isConfigured(): boolean;

  /**
   * @param order - La orden a pagar.
   * @returns Lo que la web necesita para llevar a la persona a pagar.
   */
  checkoutFor(order: {
    reference: string;
    amountInCents: number;
    currency: string;
  }): CheckoutParams;

  /**
   * Lee un aviso de la pasarela y comprueba su firma.
   *
   * @param body - El cuerpo JSON recibido, sin confiar en él.
   * @param checksumHeader - El valor de `X-Event-Checksum`, si vino.
   */
  parseEvent(body: unknown, checksumHeader: string | undefined): ParsedEvent;
}
