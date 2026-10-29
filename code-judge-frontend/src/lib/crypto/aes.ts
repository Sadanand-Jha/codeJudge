import {
  IV_BYTES,
  assertEnvelope,
  randomBytes,
  type Envelope,
  ENVELOPE_ALGORITHM,
  ENVELOPE_VERSION,
} from "./envelope";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  toBufferSource,
} from "./encoding";
import { CryptoError } from "./errors";

const WEB_CRYPTO_ALGORITHM = "AES-GCM";

export function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new CryptoError("CRYPTO_UNAVAILABLE");
  return subtle;
}

export async function encryptBytes(
  plaintext: Uint8Array,
  key: CryptoKey,
  aad: string
): Promise<Envelope> {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await getSubtle().encrypt(
    {
      name: WEB_CRYPTO_ALGORITHM,
      iv: toBufferSource(iv),
      additionalData: toBufferSource(new TextEncoder().encode(aad)),
    },
    key,
    toBufferSource(plaintext)
  );
  return {
    v: ENVELOPE_VERSION,
    alg: ENVELOPE_ALGORITHM,
    iv: bytesToBase64Url(iv),
    ct: bytesToBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptBytes(
  envelope: Envelope,
  key: CryptoKey,
  aad: string
): Promise<Uint8Array> {
  assertEnvelope(envelope);
  const iv = base64UrlToBytes(envelope.iv);
  const ciphertext = base64UrlToBytes(envelope.ct);
  try {
    const plaintext = await getSubtle().decrypt(
      {
        name: WEB_CRYPTO_ALGORITHM,
        iv: toBufferSource(iv),
        additionalData: toBufferSource(new TextEncoder().encode(aad)),
      },
      key,
      toBufferSource(ciphertext)
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new CryptoError("DECRYPT_FAILED");
  }
}
