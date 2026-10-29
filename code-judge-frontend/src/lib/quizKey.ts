import {
  fingerprintKeyHex,
  generateKeyHex,
  normalizeKeyHex,
} from "@/lib/quizCrypto";
import { unwrapDek, wrappedDekAad } from "@/lib/crypto";
import { getTeacherSecureContent } from "@/services/quizCrypto";
import {
  useQuizKeyStore,
  type QuizKeyEntry,
} from "@/store/quizKeyStore";
import { useQuizKeyGateStore } from "@/store/quizKeyGateStore";
import { useQuizKeyDialogStore } from "@/store/quizKeyDialogStore";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function generateQuizKeyHex(): string {
  return generateKeyHex();
}

/**
 * Import a pasted 64-character teacher key as the AES-GCM key that wraps the
 * quiz's data key. The key never leaves the browser.
 */
export async function importQuizKeyHex(
  keyHex: string
): Promise<QuizKeyEntry> {
  const normalized = normalizeKeyHex(keyHex);
  const api = globalThis.crypto;
  if (!api?.subtle) {
    throw new Error(
      "This browser does not support the Web Crypto API required for encrypted quizzes."
    );
  }
  const bytes = hexToBytes(normalized);
  try {
    const key = await api.subtle.importKey(
      "raw",
      bytes as unknown as BufferSource,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    return {
      keyHex: normalized,
      key,
      keyFingerprint: await fingerprintKeyHex(normalized),
    };
  } finally {
    bytes.fill(0);
  }
}

/** Check a key by trying to unwrap the quiz's wrapped data key. */
export async function verifyQuizKey(
  quizId: string,
  key: CryptoKey
): Promise<boolean> {
  try {
    const content = await getTeacherSecureContent(quizId);
    if (!content.wrappedDek) return true;
    await unwrapDek(content.wrappedDek, key, wrappedDekAad(quizId));
    return true;
  } catch {
    return false;
  }
}

export function hasQuizKey(quizId: string): boolean {
  return Boolean(useQuizKeyStore.getState().getKey(quizId));
}

/**
 * Show the key PDF download dialog for a key that was just created. Resolves
 * only after the teacher has downloaded the PDF and closed the dialog.
 */
export function showQuizKeyPdf(
  quizId: string,
  title: string | undefined,
  entry: QuizKeyEntry
): Promise<void> {
  return useQuizKeyDialogStore.getState().show({
    quizId,
    title: title?.trim() || "Untitled Quiz",
    keyHex: entry.keyHex,
    keyFingerprint: entry.keyFingerprint,
  });
}

/**
 * Return the in-memory key for a quiz. When `createIfMissing` is set (first
 * encrypted save of a new quiz), a fresh key is generated. Otherwise the
 * teacher is asked to paste the key from their PDF.
 */
export async function requireQuizKey(
  quizId: string,
  options: { title?: string; createIfMissing?: boolean } = {}
): Promise<QuizKeyEntry> {
  const existing = useQuizKeyStore.getState().getKey(quizId);
  if (existing) return existing;

  if (options.createIfMissing) {
    const entry = await importQuizKeyHex(generateQuizKeyHex());
    useQuizKeyStore.getState().setKey(quizId, entry);
    return entry;
  }

  const entry = await useQuizKeyGateStore.getState().openGate({
    quizId,
    title: options.title,
    verify: (key) => verifyQuizKey(quizId, key),
  });
  useQuizKeyStore.getState().setKey(quizId, entry);
  return entry;
}
