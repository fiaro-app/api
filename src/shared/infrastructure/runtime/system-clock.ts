import { Injectable } from '@nestjs/common';
import type { Clock } from '@/shared/application/ports/clock.port.js';

/** Reloj del sistema. */
@Injectable()
export class SystemClock implements Clock {
  /** La hora actual del sistema. */
  now(): Date {
    return new Date();
  }
}
