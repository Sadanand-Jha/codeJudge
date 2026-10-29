export type CryptoErrorCode =
  | "CRYPTO_UNAVAILABLE"
  | "INVALID_ENVELOPE"
  | "INVALID_KEY"
  | "UNSUPPORTED_VERSION"
  | "UNSUPPORTED_ALGORITHM"
  | "PASSPHRASE_TOO_SHORT"
  | "WEAK_KDF"
  | "DECRYPT_FAILED";

const MESSAGES: Record<CryptoErrorCode, string> = {
  CRYPTO_UNAVAILABLE:
    "This browser does not support the Web Crypto API required for encrypted quizzes.",
  INVALID_ENVELOPE: "Encrypted data is malformed.",
  INVALID_KEY: "The encryption key is malformed.",
  UNSUPPORTED_VERSION:
    "This encrypted quiz was saved with an unsupported version.",
  UNSUPPORTED_ALGORITHM: "This encrypted quiz uses an unsupported algorithm.",
  PASSPHRASE_TOO_SHORT: "The passphrase must be at least 10 characters long.",
  WEAK_KDF: "The key derivation settings are below the required strength.",
  DECRYPT_FAILED:
    "Could not decrypt in your browser. The key is wrong or the encrypted data is damaged.",
};

export class CryptoError extends Error {
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message?: string) {
    super(message ?? MESSAGES[code]);
    this.name = "CryptoError";
    this.code = code;
  }
}

export function isCryptoError(error: unknown): error is CryptoError {
  return error instanceof CryptoError;
}
