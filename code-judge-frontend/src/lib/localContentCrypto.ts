// Synchronous AES-256-GCM helper for question content kept in browser
// storage drafts. Drafts are local-only; the key is derived from the public
// app key so data at rest in localStorage is not readable as plain JSON.
import { gcm } from "@noble/ciphers/aes";
import { sha256 } from "@noble/hashes/sha256";

const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const AAD = new TextEncoder().encode("quizsupport:local-content:v1");
const FALLBACK_SECRET = "quizsupport-local-content-v1";

let cachedKey: Uint8Array | null = null;

function localKey(): Uint8Array {
  if (!cachedKey) {
    const secret = process.env.NEXT_PUBLIC_AES_SECRET_KEY || FALLBACK_SECRET;
    cachedKey = sha256(new TextEncoder().encode(secret));
  }
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function isEncryptedLocalPayload(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptLocalString(value: string): string {
  if (value.length === 0 || isEncryptedLocalPayload(value)) return value;
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = gcm(localKey(), iv, AAD).encrypt(new TextEncoder().encode(value));
  return `${PREFIX}${toBase64(iv)}:${toBase64(sealed)}`;
}

export function decryptLocalString(value: string): string {
  if (!isEncryptedLocalPayload(value)) return value;
  const [ivPart, sealedPart] = value.slice(PREFIX.length).split(":");
  if (!ivPart || !sealedPart) throw new Error("Encrypted local content is malformed.");
  const iv = fromBase64(ivPart);
  const sealed = fromBase64(sealedPart);
  if (iv.length !== IV_BYTES || sealed.length <= TAG_BYTES) {
    throw new Error("Encrypted local content is malformed.");
  }
  const plain = gcm(localKey(), iv, AAD).decrypt(sealed);
  return new TextDecoder().decode(plain);
}

export function encryptLocalJson(value: unknown): string {
  return encryptLocalString(JSON.stringify(value));
}

export function decryptLocalJson<T = unknown>(value: string): T {
  return JSON.parse(decryptLocalString(value)) as T;
}

/** Read a JSON localStorage value written by either the old plaintext or the encrypted writer. */
export function readLocalJson<T = unknown>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    if (isEncryptedLocalPayload(raw)) return decryptLocalJson<T>(raw);
    const parsed = JSON.parse(raw) as T;
    try {
      window.localStorage.setItem(key, encryptLocalString(raw));
    } catch {
      // Keep the readable plaintext copy if storage is full or blocked.
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Encrypt and persist a JSON localStorage value. */
export function writeLocalJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, encryptLocalJson(value));
}
