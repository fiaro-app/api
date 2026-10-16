import { Inject, Injectable } from '@nestjs/common';
import { OutdatedLegalVersionError } from '@/modules/legal/domain/errors/outdated-legal-version.error.js';
import {
  CURRENT_LEGAL_VERSION,
  type LegalDocument,
} from '@/modules/legal/domain/legal-document.js';
import type { LegalAcceptanceRepository } from '@/modules/legal/domain/repositories/legal-acceptance.repository.js';
import { LEGAL_ACCEPTANCE_REPOSITORY } from '@/modules/legal/domain/tokens/legal-acceptance-repository.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/** Lo que se acepta al registrarse y desde dónde. */
export interface RegistrationAcceptancesInput {
  readonly userId: string;
  /** La versión de los documentos que la persona vio. */
  readonly version: string;
  /** Si aceptó recibir novedades y ofertas (opcional, nunca condiciona el registro). */
  readonly marketing: boolean;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/**
 * Guarda la prueba de lo que la persona aceptó al registrarse: términos, política de privacidad y el compromiso de quien administra
 * los datos de sus clientes, más la autorización de novedades si la dio. Los tres primeros son obligatorios: el esquema de la
 * petición ya exige que vengan en `true`.
 */
@Injectable()
export class RecordRegistrationAcceptancesUseCase {
  constructor(
    @Inject(LEGAL_ACCEPTANCE_REPOSITORY)
    private readonly acceptances: LegalAcceptanceRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  /**
   * Comprueba que la versión sea la vigente. Se llama ANTES de crear la cuenta para no dejar una cuenta sin aceptación.
   *
   * @param version - La versión que la persona vio.
   * @throws {@link OutdatedLegalVersionError} Si ya no es la vigente.
   */
  assertCurrent(version: string): void {
    if (version !== CURRENT_LEGAL_VERSION)
      throw new OutdatedLegalVersionError(
        `Los documentos legales cambiaron: la versión vigente es ${CURRENT_LEGAL_VERSION}.`,
      );
  }

  /** @param input - Quién aceptó, qué versión y desde dónde. */
  async execute(input: RegistrationAcceptancesInput): Promise<void> {
    const documents: LegalDocument[] = [
      'TERMS',
      'PRIVACY',
      'DATA_RESPONSIBILITY',
      ...(input.marketing ? (['MARKETING'] as const) : []),
    ];
    await this.acceptances.recordMany(
      documents.map((document) => ({
        id: this.ids.next(),
        userId: input.userId,
        document,
        version: input.version,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      })),
    );
  }
}
