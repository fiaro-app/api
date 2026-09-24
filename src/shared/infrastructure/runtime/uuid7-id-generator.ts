import { Injectable } from '@nestjs/common';
import { v7 } from 'uuid';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

/** Genera UUIDv7: se ordenan por fecha de creación y mantienen compactos los índices (D-32). */
@Injectable()
export class Uuid7IdGenerator implements IdGenerator {
  /** Un UUIDv7 nuevo. */
  next(): string {
    return v7();
  }
}
