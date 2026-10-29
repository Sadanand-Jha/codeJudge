import { decryptBytes, encryptBytes } from "./aes";
import { utf8Decode, utf8Encode } from "./encoding";
import type { Envelope } from "./envelope";
import { CryptoError } from "./errors";

export async function encryptJson<T>(
  dek: CryptoKey,
  value: T,
  aad: string
): Promise<Envelope> {
  return encryptBytes(utf8Encode(JSON.stringify(value)), dek, aad);
}

export async function decryptJson<T>(
  dek: CryptoKey,
  envelope: Envelope,
  aad: string
): Promise<T> {
  const plaintext = await decryptBytes(envelope, dek, aad);
  try {
    return JSON.parse(utf8Decode(plaintext)) as T;
  } catch {
    throw new CryptoError("DECRYPT_FAILED");
  }
}
