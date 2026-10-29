import { base64UrlToBytes } from "./encoding";
import { CryptoError } from "./errors";

export const ENVELOPE_VERSION = 1 as const;
export const ENVELOPE_ALGORITHM = "A256GCM" as const;
export const IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;

export interface Envelope {
  v: typeof ENVELOPE_VERSION;
  alg: typeof ENVELOPE_ALGORITHM;
  iv: string;
  ct: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isEnvelope(value: unknown): value is Envelope {
  if (!isRecord(value)) return false;
  if (value.v !== ENVELOPE_VERSION) return false;
  if (value.alg !== ENVELOPE_ALGORITHM) return false;
  if (typeof value.iv !== "string" || typeof value.ct !== "string") {
    return false;
  }
  try {
    if (base64UrlToBytes(value.iv).length !== IV_BYTES) return false;
    if (base64UrlToBytes(value.ct).length < GCM_TAG_BYTES) return false;
  } catch {
    return false;
  }
  return true;
}

export function assertEnvelope(value: unknown): asserts value is Envelope {
  if (!isRecord(value)) throw new CryptoError("INVALID_ENVELOPE");
  if ("v" in value && value.v !== ENVELOPE_VERSION) {
    throw new CryptoError("UNSUPPORTED_VERSION");
  }
  if ("alg" in value && value.alg !== ENVELOPE_ALGORITHM) {
    throw new CryptoError("UNSUPPORTED_ALGORITHM");
  }
  if (!isEnvelope(value)) throw new CryptoError("INVALID_ENVELOPE");
}

export function randomBytes(length: number): Uint8Array {
  const api = globalThis.crypto;
  if (!api?.getRandomValues) throw new CryptoError("CRYPTO_UNAVAILABLE");
  const bytes = new Uint8Array(length);
  api.getRandomValues(bytes);
  return bytes;
}
