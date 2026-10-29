/**
 * Client-side end-to-end encryption for quiz content.
 *
 * The quiz is encrypted in the browser before it is uploaded. The backend only
 * ever receives ciphertext plus a key wrapped by the teacher's 64-character
 * hexadecimal key. The teacher's key is downloaded as a PDF and never sent to
 * the server, so neither the questions nor the HTML problem statements can be
 * read by the backend.
 */

export const QUIZ_CRYPTO_VERSION = 1;
export const QUIZ_KEY_HEX_LENGTH = 64;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const WEB_CRYPTO_ALGORITHM = "AES-GCM";
const PAYLOAD_ALGORITHM = "AES-256-GCM";
const KEY_FORMAT_ERROR =
  "The key must be exactly 64 hexadecimal characters (0-9, a-f).";
const UNLOCK_ERROR =
  "Could not unlock the quiz. The key is wrong or the encrypted copy is damaged.";

export interface EncryptedBlob {
  iv: string;
  ct: string;
}

export interface SecureQuizPayload {
  quizId: string;
  version: number;
  algorithm: "AES-256-GCM";
  questions: EncryptedBlob;
  /** Separately encrypted HTML problem statements, keyed by question id. */
  problemHtml: EncryptedBlob;
  wrappedKey: EncryptedBlob;
  keyFingerprint: string;
  createdAt?: string;
}

export interface UnlockedQuiz {
  quizId: string;
  version: number;
  title: string;
  questions: unknown[];
  /** Decrypted HTML problem statements keyed by question id. */
  problemHtml: Record<string, string>;
  keyFingerprint: string;
}

export interface PrepareQuizInput {
  questions: readonly unknown[];
  problemHtml?: Record<string, string>;
  title?: string;
}

export interface PrepareQuizOptions {
  quizId?: string;
  keyHex?: string;
  title?: string;
  version?: number;
  now?: Date;
}

export interface PreparedQuiz {
  quizId: string;
  keyHex: string;
  keyFingerprint: string;
  payload: SecureQuizPayload;
}

export interface KeyPdfOptions {
  quizCode?: string;
  serverQuizId?: string;
  keyFingerprint?: string;
  version?: number;
  generatedAt?: string | Date;
}

export interface KeyPdfResult {
  fileName: string;
  keyFingerprint: string;
}

export class SecureSaveCancelledError extends Error {
  constructor() {
    super(
      "Encrypted save cancelled. The key PDF was not confirmed, so the encrypted copy was not updated."
    );
    this.name = "SecureSaveCancelledError";
  }
}

export function isSecureSaveCancelledError(
  error: unknown
): error is SecureSaveCancelledError {
  return (
    error instanceof SecureSaveCancelledError ||
    (error instanceof Error &&
      (error.name === "SecureSaveCancelledError" ||
        error.name === "KekGateCancelledError" ||
        error.name === "QuizKeyGateCancelledError"))
  );
}

function getCrypto(): Crypto {
  const api = globalThis.crypto;
  if (!api?.subtle || typeof api.getRandomValues !== "function") {
    throw new Error(
      "This browser does not support the Web Crypto API required for encrypted quizzes."
    );
  }
  return api;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error(KEY_FORMAT_ERROR);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    );
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Encrypted data is malformed.");
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error("Encrypted data is malformed.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

async function importAesKey(
  raw: Uint8Array,
  extractable: boolean,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  return getCrypto().subtle.importKey(
    "raw",
    asBufferSource(raw),
    { name: WEB_CRYPTO_ALGORITHM },
    extractable,
    usages
  );
}

async function encryptBlob(
  plaintext: string,
  key: CryptoKey,
  aad: Uint8Array
): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await getCrypto().subtle.encrypt(
    {
      name: WEB_CRYPTO_ALGORITHM,
      iv: asBufferSource(iv),
      additionalData: asBufferSource(aad),
    },
    key,
    asBufferSource(encode(plaintext))
  );
  return {
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptBlob(
  blob: EncryptedBlob,
  key: CryptoKey,
  aad: Uint8Array
): Promise<Uint8Array> {
  const iv = base64ToBytes(blob.iv);
  if (iv.length !== IV_BYTES) throw new Error(UNLOCK_ERROR);
  const ciphertext = base64ToBytes(blob.ct);
  try {
    const plaintext = await getCrypto().subtle.decrypt(
      {
        name: WEB_CRYPTO_ALGORITHM,
        iv: asBufferSource(iv),
        additionalData: asBufferSource(aad),
      },
      key,
      asBufferSource(ciphertext)
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error(UNLOCK_ERROR);
  }
}

function parsePlaintext(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(UNLOCK_ERROR);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertEncryptedBlob(value: unknown): asserts value is EncryptedBlob {
  if (!isRecord(value)) throw new Error("Encrypted data is malformed.");
  const { iv, ct } = value;
  if (typeof iv !== "string" || typeof ct !== "string") {
    throw new Error("Encrypted data is malformed.");
  }
  if (base64ToBytes(iv).length !== IV_BYTES) {
    throw new Error("Encrypted data is malformed.");
  }
  // 16-byte GCM tag encodes to at least 24 base64 characters.
  if (ct.length < 24) {
    throw new Error("Encrypted data is malformed.");
  }
}

function assertPayload(value: unknown): asserts value is SecureQuizPayload {
  if (!isRecord(value)) throw new Error("Encrypted quiz data is malformed.");
  if (typeof value.quizId !== "string" || value.quizId.trim().length === 0) {
    throw new Error("Encrypted quiz data is malformed.");
  }
  if (value.version !== QUIZ_CRYPTO_VERSION) {
    throw new Error("This encrypted quiz was saved with an unsupported version.");
  }
  if (value.algorithm !== undefined && value.algorithm !== PAYLOAD_ALGORITHM) {
    throw new Error("This encrypted quiz uses an unsupported algorithm.");
  }
  assertEncryptedBlob(value.questions);
  assertEncryptedBlob(value.problemHtml);
  assertEncryptedBlob(value.wrappedKey);
  if (
    typeof value.keyFingerprint !== "string" ||
    !/^[0-9a-f]{64}$/i.test(value.keyFingerprint)
  ) {
    throw new Error("Encrypted quiz data is malformed.");
  }
}

function buildProblemHtmlMap(
  questions: readonly unknown[],
  overrides?: Record<string, string>
): Record<string, string> {
  const map: Record<string, string> = {};
  questions.forEach((question, index) => {
    const record = isRecord(question) ? question : {};
    const id =
      typeof record.id === "string" && record.id.length > 0
        ? record.id
        : String(index);
    const explicit = overrides?.[id];
    const questionHtml =
      typeof record.problemHtml === "string" ? record.problemHtml : undefined;
    const titleHtml =
      typeof record.title === "string" ? record.title : undefined;
    map[id] = explicit ?? questionHtml ?? titleHtml ?? "";
  });
  return map;
}

/** Generate a new 256-bit key as 64 lowercase hexadecimal characters. */
export function generateKeyHex(): string {
  return bytesToHex(randomBytes(KEY_BYTES));
}

/**
 * Normalize a pasted key. Spaces, dashes, colons and underscores are ignored so
 * the grouped PDF format can be pasted directly.
 */
export function normalizeKeyHex(input: string): string {
  const normalized = String(input ?? "")
    .replace(/[\s\-_:]/g, "")
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error(KEY_FORMAT_ERROR);
  }
  return normalized;
}

export function isValidKeyHex(input: string): boolean {
  try {
    normalizeKeyHex(input);
    return true;
  } catch {
    return false;
  }
}

/** Group the key as 8 blocks of 8 characters for easier reading. */
export function formatKeyHex(input: string): string {
  const normalized = normalizeKeyHex(input);
  return normalized.match(/.{8}/g)?.join("-") ?? normalized;
}

/** SHA-256 fingerprint of the key, used to verify a pasted key quickly. */
export async function fingerprintKeyHex(input: string): Promise<string> {
  const normalized = normalizeKeyHex(input);
  const digest = await getCrypto().subtle.digest(
    "SHA-256",
    asBufferSource(hexToBytes(normalized))
  );
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Encrypt a quiz in the browser.
 *
 * - A random 256-bit data key (DEK) encrypts the question JSON and the
 *   separate problem-HTML map.
 * - The teacher's key (KEK) wraps the DEK.
 * - The payload `quizId` is bound as AES-GCM additional data, so ciphertext
 *   cannot be replayed under a different quiz without failing authentication.
 */
export async function prepareQuiz(
  input: PrepareQuizInput,
  options: PrepareQuizOptions = {}
): Promise<PreparedQuiz> {
  const api = getCrypto();
  if (!Array.isArray(input.questions)) {
    throw new Error("Questions must be an array.");
  }

  const quizId = String(options.quizId ?? "").trim() || api.randomUUID();
  const title = input.title ?? options.title ?? "";
  const version = options.version ?? QUIZ_CRYPTO_VERSION;
  const keyHex = options.keyHex
    ? normalizeKeyHex(options.keyHex)
    : generateKeyHex();
  const createdAt = (options.now ?? new Date()).toISOString();
  const aad = encode(quizId);
  const problemHtml = buildProblemHtmlMap(
    input.questions,
    input.problemHtml
  );

  const dek = await api.subtle.generateKey(
    { name: WEB_CRYPTO_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const questionsPlaintext = JSON.stringify({
    title,
    questions: input.questions,
  });
  const problemHtmlPlaintext = JSON.stringify({ problemHtml });

  const [questionsBlob, problemHtmlBlob, rawDek] = await Promise.all([
    encryptBlob(questionsPlaintext, dek, aad),
    encryptBlob(problemHtmlPlaintext, dek, aad),
    api.subtle.exportKey("raw", dek),
  ]);

  const kek = await importAesKey(hexToBytes(keyHex), false, [
    "encrypt",
    "decrypt",
  ]);
  const wrappedKey = await encryptBlob(
    bytesToBase64(new Uint8Array(rawDek)),
    kek,
    aad
  );
  new Uint8Array(rawDek).fill(0);

  const keyFingerprint = await fingerprintKeyHex(keyHex);

  return {
    quizId,
    keyHex,
    keyFingerprint,
    payload: {
      quizId,
      version,
      algorithm: PAYLOAD_ALGORITHM,
      questions: questionsBlob,
      problemHtml: problemHtmlBlob,
      wrappedKey,
      keyFingerprint,
      createdAt,
    },
  };
}

/**
 * Decrypt a payload with the teacher's key. The key is never sent anywhere.
 */
export async function unlockQuiz(
  payload: SecureQuizPayload,
  keyInput: string
): Promise<UnlockedQuiz> {
  assertPayload(payload);
  const keyHex = normalizeKeyHex(keyInput);
  const derivedFingerprint = await fingerprintKeyHex(keyHex);
  if (derivedFingerprint !== payload.keyFingerprint.toLowerCase()) {
    throw new Error(UNLOCK_ERROR);
  }

  const aad = encode(payload.quizId);
  const kek = await importAesKey(hexToBytes(keyHex), false, [
    "encrypt",
    "decrypt",
  ]);
  const wrappedDekBytes = await decryptBlob(payload.wrappedKey, kek, aad);
  const rawDek = base64ToBytes(
    new TextDecoder().decode(wrappedDekBytes)
  );
  if (rawDek.length !== KEY_BYTES) throw new Error(UNLOCK_ERROR);
  const dek = await importAesKey(rawDek, false, ["decrypt"]);

  const questionsBytes = await decryptBlob(payload.questions, dek, aad);
  const problemHtmlBytes = await decryptBlob(payload.problemHtml, dek, aad);

  const questionsPlain = parsePlaintext(questionsBytes);
  const problemHtmlPlain = parsePlaintext(problemHtmlBytes);
  if (!isRecord(questionsPlain) || !Array.isArray(questionsPlain.questions)) {
    throw new Error(UNLOCK_ERROR);
  }
  if (!isRecord(problemHtmlPlain) || !isRecord(problemHtmlPlain.problemHtml)) {
    throw new Error(UNLOCK_ERROR);
  }

  const problemHtml: Record<string, string> = {};
  for (const [id, html] of Object.entries(problemHtmlPlain.problemHtml)) {
    if (typeof html === "string") problemHtml[id] = html;
  }

  return {
    quizId: payload.quizId,
    version: payload.version,
    title: typeof questionsPlain.title === "string" ? questionsPlain.title : "",
    questions: questionsPlain.questions,
    problemHtml,
    keyFingerprint: derivedFingerprint,
  };
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "quiz";
}

/**
 * Download the teacher's key as a printable PDF. The PDF contains the grouped
 * key and a QR code, but it is generated entirely in the browser.
 */
export async function downloadKeyPdf(
  keyHex: string,
  quizId: string,
  title = "Quiz",
  options: KeyPdfOptions = {}
): Promise<KeyPdfResult> {
  const normalizedKey = normalizeKeyHex(keyHex);
  const fingerprint = (
    options.keyFingerprint?.trim().toLowerCase() ||
    (await fingerprintKeyHex(normalizedKey))
  ).replace(/[^0-9a-f]/g, "");
  const displayTitle = title?.trim() || "Untitled Quiz";
  const quizLabel = options.serverQuizId?.trim() || quizId;
  const fileName = `quizsupport-encrypted-key-${safeFilePart(quizLabel)}.pdf`;

  const { renderKeyPdf } = await import("./quizKeyPdf");
  return renderKeyPdf({
    keyHex: normalizedKey,
    fingerprint,
    quizId,
    serverQuizId: quizLabel,
    title: displayTitle,
    fileName,
    version: options.version ?? QUIZ_CRYPTO_VERSION,
    generatedAt: options.generatedAt,
  });
}
