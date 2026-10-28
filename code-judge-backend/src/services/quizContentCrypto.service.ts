// Application-level encryption for quiz question/option content.
//
// Quiz runtime question and option fields are encrypted with AES-256-GCM
// before they are written to PostgreSQL and decrypted only when the backend
// needs the plaintext (grading, rendering, analytics). Ciphertext is tagged
// with a version prefix so existing plaintext rows keep working and can be
// backfilled incrementally. Question banks and saved test papers are out of
// scope.
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = "enc:v1:";
const AAD = Buffer.from("quizsupport:quiz-content:v1", "utf8");

let cachedKey: Buffer | null = null;

function encryptionSecret(): string {
  const secret =
    process.env.QUIZ_CONTENT_ENCRYPTION_KEY ||
    process.env.AES_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "QUIZ_CONTENT_ENCRYPTION_KEY (or AES_SECRET_KEY) is required to encrypt quiz content."
    );
  }
  return secret;
}

function encryptionKey(): Buffer {
  if (!cachedKey) {
    cachedKey = crypto.createHash("sha256").update(encryptionSecret()).digest();
  }
  return cachedKey;
}

export function isEncryptedValue(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encode(parts: Array<string | Buffer>): string {
  return PREFIX + parts.map((part) => Buffer.from(part).toString("base64")).join(":");
}

function decode(value: string): { iv: Buffer; tag: Buffer; ct: Buffer } {
  const encoded = value.slice(PREFIX.length);
  const [iv, tag, ct] = encoded.split(":");
  if (!iv || !tag || !ct) throw new Error("Encrypted quiz content is malformed.");
  return {
    iv: Buffer.from(iv, "base64"),
    tag: Buffer.from(tag, "base64"),
    ct: Buffer.from(ct, "base64"),
  };
}

/** Encrypt a string. Null/undefined/empty values are returned unchanged. */
export function encryptText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (text.length === 0) return "";
  if (isEncryptedValue(text)) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return encode([iv, cipher.getAuthTag(), encrypted]);
}

/**
 * Decrypt a value. Plaintext (legacy) values are returned unchanged so a
 * partial backfill never breaks reads.
 */
export function decryptText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  if (!isEncryptedValue(text)) return text;

  const { iv, tag, ct } = decode(text);
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Encrypted quiz content is malformed.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

const PROBLEM_TEXT_FIELDS = [
  "problem_statement",
  "problem_description",
  "explaination",
  "hint",
  "reference_notes",
  "internal_comments",
] as const;

const OPTION_TEXT_FIELDS = [
  "option_statement",
  "option_description",
  "matching_target",
] as const;

export function encryptProblemRow<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const next: Record<string, any> = { ...row };
  for (const field of PROBLEM_TEXT_FIELDS) {
    if (field in next) next[field] = encryptText(next[field]);
  }
  return next as T;
}

export function decryptProblemRow<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const next: Record<string, any> = { ...row };
  for (const field of PROBLEM_TEXT_FIELDS) {
    if (field in next) next[field] = decryptText(next[field]);
  }
  if (Array.isArray(next.options)) {
    next.options = next.options.map((option: any) => decryptOptionRow(option));
  }
  return next as T;
}

export function decryptProblemRows<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => decryptProblemRow(row));
}

export function encryptOptionRow<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const next: Record<string, any> = { ...row };
  for (const field of OPTION_TEXT_FIELDS) {
    if (field in next) next[field] = encryptText(next[field]);
  }
  return next as T;
}

export function decryptOptionRow<T extends Record<string, any>>(row: T): T {
  if (!row) return row;
  const next: Record<string, any> = { ...row };
  for (const field of OPTION_TEXT_FIELDS) {
    if (field in next) next[field] = decryptText(next[field]);
  }
  return next as T;
}

export function decryptOptionRows<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => decryptOptionRow(row));
}
