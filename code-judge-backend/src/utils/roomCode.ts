// Room join credentials — CSPRNG-backed code/password generation and
// normalization shared by the repository, service and HTTP layer.
import crypto from "crypto";

// No 0/O/1/I/L: these are the characters students misread in WhatsApp
// messages. 23 letters + digits 2-9 = 31 symbols.
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
export const ROOM_PASSWORD_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const ROOM_PASSWORD_LENGTH = 8;

const CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);
const JOIN_INPUT_PATTERN = new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`);

function randomString(alphabet: string, length: number): string {
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    // randomInt is rejection-sampled and cryptographically secure.
    chars.push(alphabet[crypto.randomInt(0, alphabet.length)]);
  }
  return chars.join("");
}

/** Generate a 6-character room code using the unambiguous alphabet. */
export function generateRoomCode(length = ROOM_CODE_LENGTH): string {
  return randomString(ROOM_CODE_ALPHABET, length);
}

/** Generate the default 8-character lowercase alphanumeric password. */
export function generateRoomPassword(length = ROOM_PASSWORD_LENGTH): string {
  return randomString(ROOM_PASSWORD_ALPHABET, length);
}

/** Trim and uppercase user input before lookups. */
export function normalizeRoomCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

/** True when a stored code uses the generated format. */
export function isGeneratedRoomCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

/**
 * Validate normalized user input. The wider A-Z0-9 range is intentional:
 * codes are generated from the narrow alphabet, but input from a teacher's
 * message may contain any alphanumeric character and still receives the
 * generic 401 when it does not exist.
 */
export function isValidRoomCodeInput(value: string): boolean {
  return JOIN_INPUT_PATTERN.test(value);
}
