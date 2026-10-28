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
    (error instanceof Error && error.name === "SecureSaveCancelledError")
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
  const groups = normalizedKey.match(/.{8}/g) ?? [normalizedKey];
  const fingerprint = (
    options.keyFingerprint?.trim().toLowerCase() ||
    (await fingerprintKeyHex(normalizedKey))
  ).replace(/[^0-9a-f]/g, "");
  const displayTitle = title?.trim() || "Untitled Quiz";
  const quizLabel = options.serverQuizId?.trim() || quizId;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title: "QuizSupport – Encrypted Quiz Key",
    subject: "QuizSupport end-to-end encrypted quiz key",
    author: "QuizSupport",
    creator: "QuizSupport",
  });

  const PX = 25.4 / 96;
  const mm = (value: number) => value * PX;
  const pt = (value: number) => value * 0.75;

  type RGB = [number, number, number];
  const color = (hexValue: string): RGB => [
    parseInt(hexValue.slice(1, 3), 16),
    parseInt(hexValue.slice(3, 5), 16),
    parseInt(hexValue.slice(5, 7), 16),
  ];

  const INK = color("#1B1446");
  const PURPLE = color("#6C3CF0");
  const YELLOW = color("#FDCB3F");
  const BG = color("#F3F2FC");
  const MUTED = color("#6B6890");
  const LINE = color("#E1DDF7");
  const KEY_BG = color("#F5F3FF");
  const KEY_DASH = color("#C9BDF7");
  const KEY_SHADOW = color("#CFC4FA");
  const HOW_SHADOW = color("#D9D1FF");
  const WARN_BG = color("#FFF3CF");
  const WARN_SHADOW = color("#F4A62A");
  const WARN_HEAD = color("#9A4A00");
  const WARN_TEXT = color("#5B3A0A");
  const SUBTITLE = color("#B9B2E6");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const setFill = (value: RGB) =>
    doc.setFillColor(value[0], value[1], value[2]);
  const setDraw = (value: RGB) =>
    doc.setDrawColor(value[0], value[1], value[2]);
  const setText = (value: RGB) =>
    doc.setTextColor(value[0], value[1], value[2]);

  let bodyFont = "helvetica";
  let bodyHasMedium = false;
  let monoFont = "courier";
  let monoWeight: "normal" | "bold" = "bold";

  const loadBase64 = async (path: string): Promise<string | null> => {
    try {
      if (typeof fetch !== "function") return null;
      const response = await fetch(path);
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () =>
          reject(reader.error ?? new Error("Font read failed"));
        reader.readAsDataURL(blob);
      });
      const comma = dataUrl.indexOf(",");
      return comma >= 0 ? dataUrl.slice(comma + 1) : null;
    } catch {
      return null;
    }
  };

  const loadImage = async (path: string): Promise<string | null> => {
    try {
      if (typeof fetch !== "function") return null;
      const response = await fetch(path);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () =>
          reject(reader.error ?? new Error("Image read failed"));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const [poppinsRegular, poppinsMedium, poppinsBold, jetBrainsBold] =
    await Promise.all([
      loadBase64("/fonts/Poppins-Regular.ttf"),
      loadBase64("/fonts/Poppins-Medium.ttf"),
      loadBase64("/fonts/Poppins-Bold.ttf"),
      loadBase64("/fonts/JetBrainsMono-Bold.ttf"),
    ]);

  if (poppinsRegular && poppinsBold) {
    doc.addFileToVFS("Poppins-Regular.ttf", poppinsRegular);
    doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
    doc.addFileToVFS("Poppins-Bold.ttf", poppinsBold);
    doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
    if (poppinsMedium) {
      doc.addFileToVFS("Poppins-Medium.ttf", poppinsMedium);
      doc.addFont("Poppins-Medium.ttf", "Poppins", "medium");
      bodyHasMedium = true;
    }
    bodyFont = "Poppins";
  }
  if (jetBrainsBold) {
    doc.addFileToVFS("JetBrainsMono-Bold.ttf", jetBrainsBold);
    doc.addFont("JetBrainsMono-Bold.ttf", "JetBrainsMono", "normal");
    monoFont = "JetBrainsMono";
    monoWeight = "normal";
  }

  const weightFor = (weight: "normal" | "medium" | "bold") => {
    if (bodyFont !== "Poppins") return weight === "bold" ? "bold" : "normal";
    if (weight === "medium" && !bodyHasMedium) return "normal";
    return weight;
  };

  const useBody = (
    sizePx: number,
    weight: "normal" | "medium" | "bold" = "normal"
  ) => {
    doc.setFont(bodyFont, weightFor(weight));
    doc.setFontSize(pt(sizePx));
  };

  const useMono = (sizePx: number) => {
    doc.setFont(monoFont, monoWeight);
    doc.setFontSize(pt(sizePx));
  };

  const logo = await loadImage("/logos/dark_mark.png");

  const drawLock = (
    cx: number,
    cy: number,
    size: number,
    stroke: RGB
  ) => {
    setDraw(stroke);
    doc.setLineWidth(Math.max(0.28, size * 0.14));
    doc.circle(cx, cy - size * 0.28, size * 0.32, "S");
    doc.roundedRect(
      cx - size * 0.55,
      cy - size * 0.08,
      size * 1.1,
      size * 0.82,
      size * 0.18,
      size * 0.18,
      "S"
    );
    doc.circle(cx, cy + size * 0.24, size * 0.1, "F");
  };

  const drawKeyIcon = (
    cx: number,
    cy: number,
    size: number,
    stroke: RGB
  ) => {
    setDraw(stroke);
    doc.setLineWidth(Math.max(0.35, size * 0.1));
    doc.circle(cx - size * 0.25, cy + size * 0.24, size * 0.2, "S");
    doc.line(
      cx - size * 0.08,
      cy + size * 0.08,
      cx + size * 0.42,
      cy - size * 0.42
    );
    doc.line(
      cx + size * 0.23,
      cy - size * 0.23,
      cx + size * 0.38,
      cy - size * 0.08
    );
  };

  const drawWarning = (cx: number, cy: number, size: number, stroke: RGB) => {
    setDraw(stroke);
    setFill(stroke);
    doc.setLineWidth(Math.max(0.4, size * 0.08));
    doc.triangle(
      cx,
      cy - size * 0.5,
      cx + size * 0.52,
      cy + size * 0.4,
      cx - size * 0.52,
      cy + size * 0.4,
      "S"
    );
    doc.line(cx, cy - size * 0.12, cx, cy + size * 0.1);
    doc.circle(cx, cy + size * 0.25, size * 0.045, "F");
  };

  const typedWidth = (text: string, charSpace = 0) =>
    doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1);

  const drawRichLines = (
    segments: { text: string; bold?: boolean; color?: RGB }[],
    x: number,
    y: number,
    maxWidth: number,
    sizePx: number,
    lineHeightFactor = 1.2,
    align: "left" | "center" = "left"
  ) => {
    const lineHeight = mm(sizePx * lineHeightFactor);
    const space = (bold: boolean) => {
      useBody(sizePx, bold ? "bold" : "normal");
      return doc.getTextWidth(" ");
    };
    const words: {
      text: string;
      bold?: boolean;
      color?: RGB;
      width: number;
    }[] = [];
    for (const segment of segments) {
      const pieces = segment.text.split(/\s+/).filter(Boolean);
      for (const piece of pieces) {
        useBody(sizePx, segment.bold ? "bold" : "normal");
        words.push({
          text: piece,
          bold: segment.bold,
          color: segment.color,
          width: doc.getTextWidth(piece),
        });
      }
    }

    const lines: typeof words[] = [];
    let current: typeof words = [];
    let currentWidth = 0;
    for (const word of words) {
      const gap = current.length > 0 ? space(Boolean(word.bold)) : 0;
      if (current.length > 0 && currentWidth + gap + word.width > maxWidth) {
        lines.push(current);
        current = [word];
        currentWidth = word.width;
      } else {
        current.push(word);
        currentWidth += gap + word.width;
      }
    }
    if (current.length > 0) lines.push(current);

    lines.forEach((line, lineIndex) => {
      let lineWidth = 0;
      line.forEach((word, wordIndex) => {
        lineWidth +=
          (wordIndex > 0 ? space(Boolean(word.bold)) : 0) + word.width;
      });
      let cursor = align === "center" ? x + (maxWidth - lineWidth) / 2 : x;
      line.forEach((word, wordIndex) => {
        useBody(sizePx, word.bold ? "bold" : "normal");
        if (word.color) setText(word.color);
        if (wordIndex > 0) cursor += space(Boolean(word.bold));
        doc.text(
          word.text,
          cursor,
          y + lineIndex * lineHeight + mm(sizePx * 0.82)
        );
        cursor += word.width;
      });
    });

    return { height: lines.length * lineHeight, lines: lines.length };
  };

  // Background + header -----------------------------------------------------
  setFill(BG);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  const headerContentH = mm(229);
  const headerTotalH = mm(238);
  setFill(INK);
  doc.rect(0, 0, pageWidth, headerContentH, "F");

  const polygons: [number[], string][] = [
    [[0, 0, 85, 0, 106, 57], "#1B1446"],
    [[0, 0, 106, 57, 0, 87], "#2B2268"],
    [[85, 0, 180, 0, 164, 57], "#2B2268"],
    [[85, 0, 164, 57, 106, 57], "#3A2F8C"],
    [[180, 0, 291, 0, 284, 90], "#2B2268"],
    [[180, 0, 284, 90, 164, 57], "#2B2268"],
    [[291, 0, 351, 0, 325, 106], "#1B1446"],
    [[291, 0, 325, 106, 284, 90], "#31277A"],
    [[351, 0, 442, 0, 470, 88], "#3A2F8C"],
    [[351, 0, 470, 88, 325, 106], "#201858"],
    [[442, 0, 535, 0, 536, 60], "#221A5A"],
    [[442, 0, 536, 60, 470, 88], "#3A2F8C"],
    [[535, 0, 598, 0, 588, 81], "#251C60"],
    [[535, 0, 588, 81, 536, 60], "#251C60"],
    [[598, 0, 707, 0, 679, 62], "#1B1446"],
    [[598, 0, 679, 62, 588, 81], "#251C60"],
    [[707, 0, 794, 0, 794, 65], "#251C60"],
    [[707, 0, 794, 65, 679, 62], "#1B1446"],
    [[0, 87, 106, 57, 86, 155], "#2B2268"],
    [[0, 87, 86, 155, 0, 133], "#221A5A"],
    [[106, 57, 164, 57, 198, 160], "#1B1446"],
    [[106, 57, 198, 160, 86, 155], "#201858"],
    [[164, 57, 284, 90, 273, 159], "#201858"],
    [[164, 57, 273, 159, 198, 160], "#3A2F8C"],
    [[284, 90, 325, 106, 363, 156], "#1B1446"],
    [[284, 90, 363, 156, 273, 159], "#1B1446"],
    [[325, 106, 470, 88, 427, 186], "#1B1446"],
    [[325, 106, 427, 186, 363, 156], "#2B2268"],
    [[470, 88, 536, 60, 560, 178], "#221A5A"],
    [[470, 88, 560, 178, 427, 186], "#2B2268"],
    [[536, 60, 588, 81, 630, 148], "#201858"],
    [[536, 60, 630, 148, 560, 178], "#3A2F8C"],
    [[588, 81, 679, 62, 689, 147], "#31277A"],
    [[588, 81, 689, 147, 630, 148], "#201858"],
    [[679, 62, 794, 65, 794, 135], "#2B2268"],
    [[679, 62, 794, 135, 689, 147], "#31277A"],
    [[0, 133, 86, 155, 105, 238], "#201858"],
    [[0, 133, 105, 238, 0, 238], "#3A2F8C"],
    [[86, 155, 198, 160, 170, 238], "#221A5A"],
    [[86, 155, 170, 238, 105, 238], "#201858"],
    [[198, 160, 273, 159, 286, 238], "#2B2268"],
    [[198, 160, 286, 238, 170, 238], "#3A2F8C"],
    [[273, 159, 363, 156, 346, 238], "#2B2268"],
    [[273, 159, 346, 238, 286, 238], "#1B1446"],
    [[363, 156, 427, 186, 469, 238], "#2B2268"],
    [[363, 156, 469, 238, 346, 238], "#2B2268"],
    [[427, 186, 560, 178, 551, 238], "#201858"],
    [[427, 186, 551, 238, 469, 238], "#1B1446"],
    [[560, 178, 630, 148, 587, 238], "#251C60"],
    [[560, 178, 587, 238, 551, 238], "#221A5A"],
    [[630, 148, 689, 147, 688, 238], "#221A5A"],
    [[630, 148, 688, 238, 587, 238], "#31277A"],
    [[689, 147, 794, 135, 794, 238], "#251C60"],
    [[689, 147, 794, 238, 688, 238], "#1B1446"],
  ];
  const scaleX = pageWidth / 794;
  const scaleY = headerContentH / 238;
  for (const [points, fill] of polygons) {
    setFill(color(fill));
    doc.triangle(
      points[0] * scaleX,
      points[1] * scaleY,
      points[2] * scaleX,
      points[3] * scaleY,
      points[4] * scaleX,
      points[5] * scaleY,
      "F"
    );
  }
  setFill(YELLOW);
  doc.rect(0, headerContentH, pageWidth, headerTotalH - headerContentH, "F");

  const hrowTop = mm(30);
  const hrowLeft = mm(46);
  const hrowRight = pageWidth - mm(46);
  const logoBox = mm(50);
  const logoH = logoBox * (468 / 512);
  if (logo) {
    doc.addImage(
      logo,
      "PNG",
      hrowLeft,
      hrowTop + (logoBox - logoH) / 2,
      logoBox,
      logoH
    );
  } else {
    setFill(YELLOW);
    doc.circle(
      hrowLeft + logoBox / 2,
      hrowTop + logoBox / 2,
      logoBox * 0.38,
      "F"
    );
  }

  useBody(23, "bold");
  const wordY = hrowTop + logoBox / 2 + mm(23 * 0.36);
  const wordX = hrowLeft + logoBox + mm(10);
  setText([255, 255, 255]);
  doc.text("Quiz", wordX, wordY, { charSpace: mm(-0.4) });
  const quizW = doc.getTextWidth("Quiz") + mm(-0.4) * 3;
  setText(YELLOW);
  doc.text("Support", wordX + quizW + mm(0.2), wordY, {
    charSpace: mm(-0.4),
  });

  const privacyText = "PRIVATE · DO NOT SHARE";
  const privacySpace = mm(1.1);
  useBody(9.5, "bold");
  const privacyTextW = typedWidth(privacyText, privacySpace);
  const privacyW =
    mm(11) + mm(12) + mm(7) + privacyTextW + mm(14) + mm(1.6) * 2;
  const privacyH = mm(9.5 * 1.2 + 10 + 1.6 * 2);
  const privacyX = hrowRight - privacyW;
  const privacyY = hrowTop + (logoBox - privacyH) / 2;
  setDraw(YELLOW);
  doc.setLineWidth(mm(1.6));
  doc.roundedRect(
    privacyX,
    privacyY,
    privacyW,
    privacyH,
    privacyH / 2,
    privacyH / 2,
    "S"
  );
  drawLock(
    privacyX + mm(11) + mm(6),
    privacyY + privacyH / 2,
    mm(12),
    YELLOW
  );
  setText(YELLOW);
  doc.text(
    privacyText,
    privacyX + mm(11) + mm(12) + mm(7),
    privacyY + privacyH / 2,
    { baseline: "middle", charSpace: privacySpace }
  );

  const titleX = mm(46);
  const titleTop = mm(104);
  const titleLineHeight = mm(31 * 1.12);
  useBody(31, "bold");
  setText([255, 255, 255]);
  doc.text(
    "End-to-end encrypted",
    titleX,
    titleTop + mm(31 * 0.9),
    { charSpace: mm(-0.8) }
  );
  setText(YELLOW);
  doc.text(
    "quiz key",
    titleX,
    titleTop + mm(31 * 0.9) + titleLineHeight,
    { charSpace: mm(-0.8) }
  );
  useBody(11.5, "normal");
  setText(SUBTITLE);
  doc.text(
    "Keep this PDF private. It is the only key to your questions.",
    titleX,
    titleTop +
      mm(31 * 0.9) +
      titleLineHeight +
      mm(10) +
      mm(11.5 * 0.85)
  );

  const badgeSize = mm(98);
  const badgeX = pageWidth - mm(52) - badgeSize;
  const badgeY = mm(92);
  const badgeRadius = mm(26);
  const badgeAngle = (6 * Math.PI) / 180;
  const badgeCx = badgeX + badgeSize / 2;
  const badgeCy = badgeY + badgeSize / 2;
  const pointsToPt = 72 / 25.4;
  const badgeCenterX = badgeCx * pointsToPt;
  const badgeCenterY = (pageHeight - badgeCy) * pointsToPt;
  const badgeCos = Math.cos(badgeAngle);
  const badgeSin = Math.sin(badgeAngle);
  doc.saveGraphicsState();
  doc.setCurrentTransformationMatrix(
    doc.Matrix(
      badgeCos,
      badgeSin,
      -badgeSin,
      badgeCos,
      badgeCenterX - badgeCos * badgeCenterX + badgeSin * badgeCenterY,
      badgeCenterY - badgeSin * badgeCenterX - badgeCos * badgeCenterY
    )
  );
  setFill(PURPLE);
  doc.roundedRect(
    badgeX + mm(7),
    badgeY + mm(7),
    badgeSize,
    badgeSize,
    badgeRadius,
    badgeRadius,
    "F"
  );
  setFill(YELLOW);
  setDraw([15, 10, 48]);
  doc.setLineWidth(mm(3.5));
  doc.roundedRect(
    badgeX,
    badgeY,
    badgeSize,
    badgeSize,
    badgeRadius,
    badgeRadius,
    "FD"
  );
  drawKeyIcon(badgeCx, badgeCy, mm(50), INK);
  doc.restoreGraphicsState();

  // Main content ------------------------------------------------------------
  const mainX = mm(46);
  const mainRight = pageWidth - mm(46);
  const mainW = mainRight - mainX;
  let cursorY = mm(262);

  const tagText = "ENCRYPTED QUIZ";
  const tagSpace = mm(1.3);
  useBody(9, "bold");
  const tagTextW = typedWidth(tagText, tagSpace);
  const tagW = mm(11) + mm(10) + mm(7) + tagTextW + mm(11) + mm(1.6) * 2;
  const tagH = mm(9 * 1.5 + 6 + 1.6 * 2);
  setFill(color("#E9E2FF"));
  setDraw(PURPLE);
  doc.setLineWidth(mm(1.6));
  doc.roundedRect(mainX, cursorY, tagW, tagH, tagH / 2, tagH / 2, "FD");
  drawLock(mainX + mm(11) + mm(5), cursorY + tagH / 2, mm(10), PURPLE);
  setText(PURPLE);
  doc.text(
    tagText,
    mainX + mm(11) + mm(10) + mm(7),
    cursorY + tagH / 2,
    { baseline: "middle", charSpace: tagSpace }
  );

  const chipSize = 10.5;
  const chipPadX = mm(13);
  const chipPadY = mm(4);
  const chipBorder = mm(1.8);
  useBody(chipSize, "normal");
  const chipSpecs = [
    { label: "Quiz ID", value: quizId },
    { label: "Server ID", value: quizLabel },
  ].map((chip) => {
    useBody(chipSize, "normal");
    const labelW = doc.getTextWidth(`${chip.label} `);
    useBody(chipSize, "bold");
    const valueW = doc.getTextWidth(chip.value);
    return {
      ...chip,
      labelW,
      valueW,
      width: chipPadX * 2 + chipBorder * 2 + labelW + valueW,
      height: mm(chipSize * 1.2) + chipPadY * 2 + chipBorder * 2,
    };
  });
  const chipsW =
    chipSpecs.reduce((sum, chip) => sum + chip.width, 0) + mm(8);
  const titleMaxW = mainW - chipsW - mm(12);
  useBody(36, "bold");
  const titleLines: string[] = doc.splitTextToSize(displayTitle, titleMaxW);
  const titleLineH = mm(36 * 1.1);
  const qrowBottom =
    cursorY + tagH + mm(8) + titleLines.length * titleLineH;

  useBody(36, "bold");
  setText(INK);
  titleLines.forEach((line, index) => {
    doc.text(
      line,
      mainX,
      cursorY + tagH + mm(8) + mm(36 * 0.86) + index * titleLineH,
      { charSpace: mm(-1.1) }
    );
  });

  let chipRight = mainRight;
  const chipY = qrowBottom - mm(4) - chipSpecs[0].height;
  for (let index = chipSpecs.length - 1; index >= 0; index -= 1) {
    const chip = chipSpecs[index];
    const chipX = chipRight - chip.width;
    setFill([255, 255, 255]);
    setDraw(LINE);
    doc.setLineWidth(chipBorder);
    doc.roundedRect(
      chipX,
      chipY,
      chip.width,
      chip.height,
      chip.height / 2,
      chip.height / 2,
      "FD"
    );
    useBody(chipSize, "normal");
    setText(MUTED);
    doc.text(
      `${chip.label} `,
      chipX + chipPadX,
      chipY + chip.height / 2,
      { baseline: "middle" }
    );
    useBody(chipSize, "bold");
    setText(INK);
    doc.text(
      chip.value,
      chipX + chipPadX + chip.labelW,
      chipY + chip.height / 2,
      { baseline: "middle" }
    );
    chipRight = chipX - mm(8);
  }

  const gap = mm(22);
  const qrCardW = mm(186);
  const keyCardW = mainW - qrCardW - gap;
  const cardBorder = mm(3);
  const keyPadX = mm(22);
  const keyPadTop = mm(20);
  const keyPadBottom = mm(16);
  const keyInnerW = keyCardW - keyPadX * 2 - cardBorder * 2;

  const keyLabelText = "TEACHER KEY · PASTE THIS TO UNLOCK";
  const keyLabelSpace = mm(1.2);
  useBody(9, "bold");
  const keyLabelTextW = typedWidth(keyLabelText, keyLabelSpace);
  const keyLabelW =
    mm(9) + mm(12) + mm(7) + keyLabelTextW + mm(12) + mm(2) * 2;
  const keyLabelH = mm(9 * 1.2 + 10 + 2 * 2);

  let keyFontPx = 15.5;
  let chipW = 0;
  let chipH = 0;
  let rowW = 0;
  const dashW = mm(10);
  const chipGap = mm(3);
  const keywrapInnerW = keyInnerW - mm(10) * 2 - mm(2) * 2;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    useMono(keyFontPx);
    chipW = doc.getTextWidth(groups[0] ?? "") + mm(12) + mm(2) * 2;
    chipH = mm(keyFontPx * 1.25 + 12 + 2 * 2);
    rowW = chipW * 4 + dashW * 3 + chipGap * 6;
    if (rowW <= keywrapInnerW || keyFontPx <= 10) break;
    keyFontPx -= 0.25;
  }
  const keywrapH =
    mm(2) * 2 + mm(14) * 2 + mm(7) * 3 + chipH * 2;
  const fpSize = 7.4;
  const fpLineH = mm(fpSize * 1.5);
  const fpLabel = "FINGERPRINT";
  const fpLabelSpace = mm(0.8);
  useBody(fpSize, "bold");
  const fpLabelW = typedWidth(fpLabel, fpLabelSpace);
  const fpGroups = fingerprint.match(/.{1,16}/g) ?? [fingerprint];
  useMono(fpSize);
  const fpGroupWidths = fpGroups.map((group) => doc.getTextWidth(group));
  const fpGap = mm(6);
  const fpAvailable = keyInnerW - fpLabelW - mm(8);
  let fpLines = 1;
  let fpLineWidth = 0;
  for (let index = 0; index < fpGroupWidths.length; index += 1) {
    const addition =
      fpGroupWidths[index] + (index > 0 ? fpGap : 0);
    if (index > 0 && fpLineWidth + addition > fpAvailable) {
      fpLines += 1;
      fpLineWidth = fpGroupWidths[index];
    } else {
      fpLineWidth += addition;
    }
  }
  const fpH = fpLines * fpLineH;

  const keyCardH =
    cardBorder * 2 +
    keyPadTop +
    keyLabelH +
    mm(16) +
    keywrapH +
    mm(12) +
    fpH +
    mm(4) +
    keyPadBottom;

  const qrPadX = mm(16);
  const qrInnerW = qrCardW - qrPadX * 2 - cardBorder * 2;
  const qrBoxSize = mm(140);
  const qrInner = qrBoxSize - mm(8) * 2 - mm(2.2) * 2;
  const scanH = mm(13);
  useBody(7.6, "normal");
  const qrSmallLines: string[] = doc.splitTextToSize(
    "Scan with your phone to copy the key",
    qrInnerW
  );
  const qrSmallH = qrSmallLines.length * mm(7.6 * 1.2);
  const qrContentH =
    qrBoxSize + mm(11) + scanH + mm(3) + qrSmallH;
  const qrCardH =
    cardBorder * 2 + mm(16) + mm(13) + qrContentH;
  const gridH = Math.max(keyCardH, qrCardH);
  const gridY = qrowBottom + mm(26);

  // Key card
  setFill(YELLOW);
  doc.roundedRect(
    mainX + mm(8),
    gridY + mm(8),
    keyCardW,
    gridH,
    mm(22),
    mm(22),
    "F"
  );
  setFill([255, 255, 255]);
  setDraw(INK);
  doc.setLineWidth(cardBorder);
  doc.roundedRect(
    mainX,
    gridY,
    keyCardW,
    gridH,
    mm(22),
    mm(22),
    "FD"
  );

  const keyContentX = mainX + cardBorder + keyPadX;
  let keyY = gridY + cardBorder + keyPadTop;
  setFill(PURPLE);
  doc.roundedRect(
    keyContentX,
    keyY,
    keyLabelW,
    keyLabelH,
    keyLabelH / 2,
    keyLabelH / 2,
    "F"
  );
  drawKeyIcon(
    keyContentX + mm(9) + mm(6),
    keyY + keyLabelH / 2,
    mm(12),
    YELLOW
  );
  setText([255, 255, 255]);
  doc.text(
    keyLabelText,
    keyContentX + mm(9) + mm(12) + mm(7),
    keyY + keyLabelH / 2,
    { baseline: "middle", charSpace: keyLabelSpace }
  );
  keyY += keyLabelH + mm(16);

  const keywrapX = keyContentX;
  const keywrapW = keyCardW - keyPadX * 2 - cardBorder * 2;
  setFill(KEY_BG);
  setDraw(KEY_DASH);
  doc.setLineWidth(mm(2));
  doc.setLineDashPattern([mm(3), mm(2)], 0);
  doc.roundedRect(
    keywrapX,
    keyY,
    keywrapW,
    keywrapH,
    mm(16),
    mm(16),
    "FD"
  );
  doc.setLineDashPattern([], 0);

  const rowGap = mm(7);
  let rowY = keyY + mm(2) + mm(14) + rowGap;
  for (let row = 0; row < 2; row += 1) {
    let rowX = keywrapX + (keywrapW - rowW) / 2;
    for (let col = 0; col < 4; col += 1) {
      const group = groups[row * 4 + col] ?? "";
      setFill(KEY_SHADOW);
      doc.roundedRect(
        rowX + mm(2.5),
        rowY + mm(2.5),
        chipW,
        chipH,
        mm(9),
        mm(9),
        "F"
      );
      setFill([255, 255, 255]);
      setDraw(INK);
      doc.setLineWidth(mm(2));
      doc.roundedRect(
        rowX,
        rowY,
        chipW,
        chipH,
        mm(9),
        mm(9),
        "FD"
      );
      useMono(keyFontPx);
      setText(INK);
      doc.text(
        group,
        rowX + chipW / 2,
        rowY + chipH / 2,
        { align: "center", baseline: "middle", charSpace: mm(0.2) }
      );
      rowX += chipW;
      if (col < 3) {
        useBody(13, "bold");
        setText(PURPLE);
        doc.text("–", rowX + chipGap + dashW / 2, rowY + chipH / 2, {
          align: "center",
          baseline: "middle",
        });
        rowX += chipGap + dashW + chipGap;
      }
    }
    rowY += chipH + rowGap;
  }

  keyY += keywrapH + mm(12);
  let fpX = keyContentX;
  useBody(fpSize, "bold");
  setText(INK);
  doc.text(fpLabel, fpX, keyY + mm(fpSize * 0.82), {
    charSpace: fpLabelSpace,
  });
  fpX += fpLabelW + mm(8);
  useMono(fpSize);
  setText(MUTED);
  let fpLine = 0;
  let fpLineUsed = 0;
  fpGroups.forEach((group, index) => {
    const width = fpGroupWidths[index];
    const addition = width + (fpLineUsed > 0 ? fpGap : 0);
    if (fpLineUsed > 0 && fpLineUsed + addition > fpAvailable) {
      fpLine += 1;
      fpLineUsed = 0;
    }
    const x = fpX + fpLineUsed + (fpLineUsed > 0 ? fpGap : 0);
    doc.text(
      group,
      x,
      keyY + fpLine * fpLineH + mm(fpSize * 0.82)
    );
    fpLineUsed += (fpLineUsed > 0 ? fpGap : 0) + width;
  });

  // QR card
  const qrX = mainX + keyCardW + gap;
  setFill(PURPLE);
  doc.roundedRect(
    qrX + mm(8),
    gridY + mm(8),
    qrCardW,
    gridH,
    mm(22),
    mm(22),
    "F"
  );
  setFill([255, 255, 255]);
  setDraw(INK);
  doc.setLineWidth(cardBorder);
  doc.roundedRect(
    qrX,
    gridY,
    qrCardW,
    gridH,
    mm(22),
    mm(22),
    "FD"
  );
  const qrContentY = gridY + (gridH - (cardBorder * 2 + qrContentH)) / 2 + cardBorder;
  const qrBoxX = qrX + (qrCardW - qrBoxSize) / 2;
  setFill([255, 255, 255]);
  setDraw(INK);
  doc.setLineWidth(mm(2.2));
  doc.roundedRect(
    qrBoxX,
    qrContentY,
    qrBoxSize,
    qrBoxSize,
    mm(14),
    mm(14),
    "FD"
  );
  try {
    const QRCode = (await import("qrcode")).default;
    const qrDataUrl = await QRCode.toDataURL(normalizedKey, {
      margin: 1,
      width: 720,
      errorCorrectionLevel: "M",
      color: { dark: "#1B1446", light: "#ffffff" },
    });
    doc.addImage(
      qrDataUrl,
      "PNG",
      qrBoxX + mm(8) + mm(2.2),
      qrContentY + mm(8) + mm(2.2),
      qrInner,
      qrInner
    );
  } catch {
    useBody(7, "normal");
    setText(MUTED);
    doc.text("QR unavailable", qrX + qrCardW / 2, qrContentY + qrBoxSize / 2, {
      align: "center",
    });
  }

  let qrY = qrContentY + qrBoxSize + mm(11);
  useBody(9.5, "bold");
  setText(INK);
  const scanText = "SCAN TO COPY";
  const scanSpace = mm(1.3);
  const scanTextW = typedWidth(scanText, scanSpace);
  const scanTotalW = mm(13) + mm(6) + scanTextW;
  const scanX = qrX + (qrCardW - scanTotalW) / 2;
  setDraw(INK);
  doc.setLineWidth(mm(1.6));
  const scanCx = scanX + mm(6.5);
  const scanCy = qrY + scanH / 2;
  const scanSize = mm(13);
  const corner = scanSize * 0.28;
  doc.line(scanCx - scanSize / 2, scanCy - scanSize / 2 + corner, scanCx - scanSize / 2, scanCy - scanSize / 2);
  doc.line(scanCx - scanSize / 2, scanCy - scanSize / 2, scanCx - scanSize / 2 + corner, scanCy - scanSize / 2);
  doc.line(scanCx + scanSize / 2 - corner, scanCy - scanSize / 2, scanCx + scanSize / 2, scanCy - scanSize / 2);
  doc.line(scanCx + scanSize / 2, scanCy - scanSize / 2, scanCx + scanSize / 2, scanCy - scanSize / 2 + corner);
  doc.line(scanCx - scanSize / 2, scanCy + scanSize / 2 - corner, scanCx - scanSize / 2, scanCy + scanSize / 2);
  doc.line(scanCx - scanSize / 2, scanCy + scanSize / 2, scanCx - scanSize / 2 + corner, scanCy + scanSize / 2);
  doc.line(scanCx + scanSize / 2 - corner, scanCy + scanSize / 2, scanCx + scanSize / 2, scanCy + scanSize / 2);
  doc.line(scanCx + scanSize / 2, scanCy + scanSize / 2, scanCx + scanSize / 2, scanCy + scanSize / 2 - corner);
  doc.line(scanCx - scanSize / 2, scanCy, scanCx + scanSize / 2, scanCy);
  setText(INK);
  doc.text(scanText, scanX + mm(13) + mm(6), scanCy, {
    baseline: "middle",
    charSpace: scanSpace,
  });
  qrY += scanH + mm(3);
  useBody(7.6, "normal");
  setText(MUTED);
  qrSmallLines.forEach((line, index) => {
    doc.text(line, qrX + qrCardW / 2, qrY + mm(7.6 * 0.82) + index * mm(7.6 * 1.2), {
      align: "center",
    });
  });

  // How-to card
  const howBorder = mm(2.5);
  const howPadTop = mm(20);
  const howPadX = mm(24);
  const howPadBottom = mm(14);
  const howInnerW = mainW - howPadX * 2 - howBorder * 2;
  const howTitleSize = 15;
  const howTitleH = mm(howTitleSize * 1.2);
  const howTitleGap = mm(12);
  const stepSize = 11;
  const stepLineH = mm(stepSize * 1.55);
  const stepPadY = mm(8.6);
  const numSize = mm(25);
  const numGap = mm(13);
  const stepTextW = howInnerW - numSize - numGap;

  const steps: { text: string; bold?: boolean; color?: RGB }[][] = [
    [{ text: "Keep this PDF safe. Anyone with this key can read the quiz." }],
    [
      { text: "To view the encrypted copy, open " },
      { text: "Quiz Studio", bold: true },
      { text: " and choose " },
      { text: "“Open encrypted copy”", bold: true },
      { text: " on the Review & publish step." },
    ],
    [
      { text: "Paste the full key " },
      { text: "(spaces and dashes are ignored)", color: MUTED },
      { text: "." },
    ],
    [
      { text: "The key is checked in your browser and is " },
      { text: "never uploaded", bold: true },
      { text: "." },
    ],
  ];

  const stepHeights = steps.map((segments) => {
    const measured = drawRichLines(
      segments,
      0,
      -1000,
      stepTextW,
      stepSize,
      1.55
    );
    return Math.max(numSize + mm(1), measured.height) + stepPadY * 2;
  });
  const howH =
    howBorder * 2 +
    howPadTop +
    howTitleH +
    howTitleGap +
    stepHeights.reduce((sum, height) => sum + height, 0) +
    howPadBottom;
  const howY = gridY + gridH + mm(35);

  setFill(HOW_SHADOW);
  doc.roundedRect(
    mainX + mm(6),
    howY + mm(6),
    mainW,
    howH,
    mm(22),
    mm(22),
    "F"
  );
  setFill([255, 255, 255]);
  setDraw(INK);
  doc.setLineWidth(howBorder);
  doc.roundedRect(mainX, howY, mainW, howH, mm(22), mm(22), "FD");

  const howInnerX = mainX + howBorder + howPadX;
  let howCursorY = howY + howBorder + howPadTop;
  drawLock(
    howInnerX + mm(9.5),
    howCursorY + howTitleH / 2,
    mm(19),
    PURPLE
  );
  useBody(howTitleSize, "bold");
  setText(INK);
  doc.text(
    "How to unlock this quiz",
    howInnerX + mm(19) + mm(9),
    howCursorY + howTitleH / 2,
    { baseline: "middle" }
  );
  howCursorY += howTitleH + howTitleGap;

  steps.forEach((segments, index) => {
    if (index > 0) {
      setDraw(LINE);
      doc.setLineWidth(mm(1.6));
      doc.setLineDashPattern([mm(3), mm(2)], 0);
      doc.line(howInnerX, howCursorY, howInnerX + howInnerW, howCursorY);
      doc.setLineDashPattern([], 0);
    }
    const itemTop = howCursorY;
    howCursorY += stepPadY;
    const numCx = howInnerX + numSize / 2;
    const numCy = howCursorY + numSize / 2;
    setFill(YELLOW);
    setDraw(INK);
    doc.setLineWidth(mm(2.2));
    doc.circle(numCx, numCy, numSize / 2, "FD");
    useBody(11.5, "bold");
    setText(INK);
    doc.text(String(index + 1), numCx, numCy, {
      align: "center",
      baseline: "middle",
    });
    drawRichLines(
      segments,
      howInnerX + numSize + numGap,
      howCursorY,
      stepTextW,
      stepSize,
      1.55
    );
    howCursorY = itemTop + stepHeights[index];
  });

  // Important card
  const impBorder = mm(3);
  const impPadTop = mm(17);
  const impPadX = mm(22);
  const impPadBottom = mm(17);
  const impInnerW = mainW - impPadX * 2 - impBorder * 2;
  const impIconSize = mm(50);
  const impGap = mm(16);
  const impTextW = impInnerW - impIconSize - impGap;
  const impHeadSize = 10;
  const impBodySize = 11;
  useBody(impBodySize, "normal");
  const impBodyLines: string[] = doc.splitTextToSize(
    "QuizSupport cannot recover this key. If you lose this PDF, the encrypted copy of your quiz cannot be opened. Saving encrypted content again creates a new key and replaces the old encrypted copy.",
    impTextW
  );
  const impBodyH = impBodyLines.length * mm(impBodySize * 1.55);
  const impTextH = mm(impHeadSize * 1.2) + mm(4) + impBodyH;
  const impContentH = Math.max(impIconSize, impTextH);
  const impH = impBorder * 2 + impPadTop + impContentH + impPadBottom;
  const impY = howY + howH + mm(33);

  setFill(WARN_SHADOW);
  doc.roundedRect(
    mainX + mm(7),
    impY + mm(7),
    mainW,
    impH,
    mm(22),
    mm(22),
    "F"
  );
  setFill(WARN_BG);
  setDraw(INK);
  doc.setLineWidth(impBorder);
  doc.roundedRect(mainX, impY, mainW, impH, mm(22), mm(22), "FD");

  const impInnerX = mainX + impBorder + impPadX;
  const impInnerY = impY + impBorder + impPadTop;
  const impIconX = impInnerX;
  const impIconY = impInnerY + (impContentH - impIconSize) / 2;
  setFill(YELLOW);
  setDraw(INK);
  doc.setLineWidth(mm(2.8));
  doc.roundedRect(
    impIconX,
    impIconY,
    impIconSize,
    impIconSize,
    mm(15),
    mm(15),
    "FD"
  );
  drawWarning(
    impIconX + impIconSize / 2,
    impIconY + impIconSize / 2,
    mm(28),
    INK
  );

  const impTextX = impIconX + impIconSize + impGap;
  const impTextY = impInnerY + (impContentH - impTextH) / 2;
  useBody(impHeadSize, "bold");
  setText(WARN_HEAD);
  doc.text("IMPORTANT", impTextX, impTextY + mm(impHeadSize * 0.82), {
    charSpace: mm(1.5),
  });
  useBody(impBodySize, "medium");
  setText(WARN_TEXT);
  const impBodyTop = impTextY + mm(impHeadSize * 1.2) + mm(4);
  impBodyLines.forEach((line, index) => {
    doc.text(
      line,
      impTextX,
      impBodyTop + mm(impBodySize * 0.82) + index * mm(impBodySize * 1.55)
    );
  });

  // Footer ------------------------------------------------------------------
  const footLineY = pageHeight - mm(26) - mm(34);
  setDraw(LINE);
  doc.setLineWidth(mm(2));
  doc.line(mainX, footLineY, mainRight, footLineY);
  const footContentTop = footLineY + mm(2) + mm(12);
  if (logo) {
    const footLogoH = mm(20) * (468 / 512);
    doc.addImage(
      logo,
      "PNG",
      mainX,
      footContentTop + (mm(20) - footLogoH) / 2,
      mm(20),
      footLogoH
    );
  }
  useBody(8.2, "normal");
  setText(MUTED);
  doc.text(
    "Generated in your browser by QuizSupport. The key was not sent to the server.",
    mainX + mm(20) + mm(8),
    footContentTop + mm(20) / 2,
    { baseline: "middle" }
  );
  const stamp = new Date().toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  doc.text(
    `Version ${QUIZ_CRYPTO_VERSION}  |  ${stamp}`,
    mainRight,
    footContentTop + mm(20) / 2,
    { align: "right", baseline: "middle" }
  );

  const fileName = `quizsupport-encrypted-key-${safeFilePart(quizLabel)}.pdf`;
  doc.save(fileName);
  return { fileName, keyFingerprint: fingerprint };
}
