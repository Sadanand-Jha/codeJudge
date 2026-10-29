import {
  answerKeyAad,
  KEK_CHECK_AAD,
  questionPayloadAad,
  wrappedDekAad,
} from "./aad";
import { decryptBytes, encryptBytes, getSubtle } from "./aes";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  toBufferSource,
  utf8Decode,
  utf8Encode,
} from "./encoding";
import { randomBytes, type Envelope } from "./envelope";
import { CryptoError } from "./errors";

export const KDF_ALGORITHM = "PBKDF2-HMAC-SHA-256";
export const PBKDF2_MIN_ITERATIONS = 600_000;
export const PBKDF2_DEFAULT_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const DEK_BYTES = 32;
export const MIN_PASSPHRASE_LENGTH = 10;

const KEK_CHECK_PLAINTEXT = "quizsupport:kek-check:v1";
const WEB_CRYPTO_ALGORITHM = "AES-GCM";

export interface KdfParams {
  iterations: number;
  salt: string;
}

export function createKdfParams(
  iterations: number = PBKDF2_DEFAULT_ITERATIONS
): KdfParams {
  if (
    !Number.isInteger(iterations) ||
    iterations < PBKDF2_MIN_ITERATIONS
  ) {
    throw new CryptoError("WEAK_KDF");
  }
  return {
    iterations,
    salt: bytesToBase64Url(randomBytes(SALT_BYTES)),
  };
}

function assertKdfParams(params: KdfParams): Uint8Array {
  if (
    !params ||
    !Number.isInteger(params.iterations) ||
    params.iterations < PBKDF2_MIN_ITERATIONS ||
    typeof params.salt !== "string"
  ) {
    throw new CryptoError("WEAK_KDF");
  }
  const salt = base64UrlToBytes(params.salt);
  if (salt.length < SALT_BYTES) throw new CryptoError("WEAK_KDF");
  return salt;
}

export async function deriveKek(
  secret: string,
  params: KdfParams
): Promise<CryptoKey> {
  if (typeof secret !== "string" || secret.length < MIN_PASSPHRASE_LENGTH) {
    throw new CryptoError("PASSPHRASE_TOO_SHORT");
  }
  const salt = assertKdfParams(params);
  const material = await getSubtle().importKey(
    "raw",
    toBufferSource(utf8Encode(secret)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return getSubtle().deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toBufferSource(salt),
      iterations: params.iterations,
    },
    material,
    { name: WEB_CRYPTO_ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function makeKekCheck(kek: CryptoKey): Promise<Envelope> {
  return encryptBytes(
    utf8Encode(KEK_CHECK_PLAINTEXT),
    kek,
    KEK_CHECK_AAD
  );
}

export async function verifyKekCheck(
  kek: CryptoKey,
  check: Envelope
): Promise<boolean> {
  try {
    const plaintext = await decryptBytes(check, kek, KEK_CHECK_AAD);
    return utf8Decode(plaintext) === KEK_CHECK_PLAINTEXT;
  } catch {
    return false;
  }
}

export async function generateDek(): Promise<CryptoKey> {
  return getSubtle().generateKey(
    { name: WEB_CRYPTO_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function wrapDek(
  dek: CryptoKey,
  kek: CryptoKey,
  aad: string
): Promise<Envelope> {
  const raw = new Uint8Array(await getSubtle().exportKey("raw", dek));
  try {
    return await encryptBytes(raw, kek, aad);
  } finally {
    raw.fill(0);
  }
}

export async function unwrapDek(
  envelope: Envelope,
  kek: CryptoKey,
  aad: string
): Promise<CryptoKey> {
  const raw = await decryptBytes(envelope, kek, aad);
  try {
    if (raw.length !== DEK_BYTES) throw new CryptoError("INVALID_KEY");
    return await getSubtle().importKey(
      "raw",
      toBufferSource(raw),
      { name: WEB_CRYPTO_ALGORITHM },
      true,
      ["encrypt", "decrypt"]
    );
  } finally {
    raw.fill(0);
  }
}

export async function exportDekB64Url(dek: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await getSubtle().exportKey("raw", dek));
  try {
    if (raw.length !== DEK_BYTES) throw new CryptoError("INVALID_KEY");
    return bytesToBase64Url(raw);
  } finally {
    raw.fill(0);
  }
}

export async function importDekB64Url(
  value: string,
  usages: KeyUsage[] = ["decrypt", "encrypt"]
): Promise<CryptoKey> {
  const raw = base64UrlToBytes(value);
  try {
    if (raw.length !== DEK_BYTES) throw new CryptoError("INVALID_KEY");
    const allowed = usages.filter(
      (usage) => usage === "encrypt" || usage === "decrypt"
    );
    if (allowed.length === 0) throw new CryptoError("INVALID_KEY");
    return await getSubtle().importKey(
      "raw",
      toBufferSource(raw),
      { name: WEB_CRYPTO_ALGORITHM },
      false,
      allowed
    );
  } finally {
    raw.fill(0);
  }
}

export { answerKeyAad, questionPayloadAad, wrappedDekAad };
