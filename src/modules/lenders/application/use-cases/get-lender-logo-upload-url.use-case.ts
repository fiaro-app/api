import { Inject, Injectable } from '@nestjs/common';
import type { GetLenderLogoUploadUrlInput } from '@/modules/lenders/application/dtos/lender-logo-upload-url.dto.js';
import { LOGO_EXTENSION } from '@/modules/lenders/domain/logo-policy.js';
import type {
  ObjectStoragePort,
  PresignedUpload,
} from '@/shared/application/ports/object-storage.port.js';
import { OBJECT_STORAGE } from '@/shared/application/ports/object-storage.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Una URL firmada para subir el logo del prestamista (PROTOTIPO-FLUJOS.md §4.9, D-102): el
 * archivo va directo del dispositivo al bucket, nunca por la API. Una vez subido, quien llama
 * guarda la URL pública con `PATCH /lender { logoUrl }` (D-75) — esta pieza no toca `Lender`.
 *
 * @remarks
 * La URL firma el tipo (PNG o JPEG) y el peso exactos (hasta 2 MB) que se pidieron: el bucket rechaza
 * otra cosa (D-132). La llave (`logos/<lenderId>/<id>.<ext>`) es nueva en cada llamada (`IdGenerator`, UUIDv7): un
 * logo viejo nunca se sobrescribe, así que sigue accesible por su URL hasta que algo deje de
 * referenciarlo. Sin limpieza de logos huérfanos todavía (si la subida nunca llega, o si el
 * `PATCH` nunca se hace, el objeto queda en el bucket sin que nada lo borre) — a la escala de la
 * Fase 1, unos cuantos archivos de 2 MB como máximo no justifican un job de limpieza.
 */
@Injectable()
export class GetLenderLogoUploadUrlUseCase {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(input: GetLenderLogoUploadUrlInput): Promise<PresignedUpload> {
    const extension = LOGO_EXTENSION[input.contentType];
    const key = `logos/${input.lenderId}/${this.ids.next()}.${extension}`;
    return this.storage.getPresignedUploadUrl(key, {
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });
  }
}
