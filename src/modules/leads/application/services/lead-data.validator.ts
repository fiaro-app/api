import { toColombianE164 } from '@fiaro-app/contracts';
import type { CreateLeadInput } from '@/modules/leads/application/dtos/create-lead.dto.js';
import { InvalidLeadDataError } from '@/modules/leads/domain/errors/invalid-lead-data.error.js';

/** Datos del contacto ya validados y normalizados. */
export interface ValidLeadData {
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly message: string;
}

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 1000;
const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida y normaliza los datos de un contacto de ventas: el nombre y el mensaje recortados y con
 * un largo razonable, el celular en formato E.164 colombiano, el correo con una forma básica, y al
 * menos uno de los dos medios de contacto.
 *
 * @param input - Lo que escribió la persona.
 * @returns Los datos normalizados.
 * @throws {@link InvalidLeadDataError} Con un `issue` por cada campo que no cumple.
 */
export function validateLeadData(input: CreateLeadInput): ValidLeadData {
  const name = input.name.trim();
  const message = input.message.trim();
  const phone = parsePhone(input.phone);
  const email = parseEmail(input.email);

  const issues = [
    ...lengthIssue('name', name, 2, MAX_NAME_LENGTH),
    ...lengthIssue('message', message, 5, MAX_MESSAGE_LENGTH),
    ...contactIssues(phone, email),
  ];
  if (issues.length > 0) {
    throw new InvalidLeadDataError(issues);
  }
  return { name, phone: phone.value, email: email.value, message };
}

/** Lo que salió de leer un medio de contacto: su valor normalizado y si lo que escribió era válido. */
interface ParsedContact {
  readonly value: string | null;
  /** Si escribió algo (aunque no sirva). */
  readonly provided: boolean;
}

function parsePhone(input: string | undefined): ParsedContact {
  const text = input?.trim() ?? '';
  return {
    value: text === '' ? null : toColombianE164(text),
    provided: text !== '',
  };
}

function parseEmail(input: string | undefined): ParsedContact {
  const text = (input?.trim() ?? '').toLowerCase();
  return {
    value: text !== '' && SIMPLE_EMAIL.test(text) ? text : null,
    provided: text !== '',
  };
}

function contactIssues(phone: ParsedContact, email: ParsedContact) {
  if (phone.provided && phone.value === null) {
    return [issue('phone', 'El celular no es un número colombiano válido.')];
  }
  if (email.provided && email.value === null) {
    return [issue('email', 'El correo no es válido.')];
  }
  if (phone.value === null && email.value === null) {
    return [
      issue('phone', 'Deja un celular o un correo para poder responderte.'),
    ];
  }
  return [];
}

function issue(field: string, message: string) {
  return { path: [field], message, params: {} } as const;
}

function lengthIssue(field: string, value: string, min: number, max: number) {
  if (value.length < min) {
    return [issue(field, `Debe tener al menos ${String(min)} caracteres.`)];
  }
  if (value.length > max) {
    return [issue(field, `Debe tener como máximo ${String(max)} caracteres.`)];
  }
  return [];
}
