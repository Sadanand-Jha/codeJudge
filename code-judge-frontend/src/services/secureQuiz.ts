import apiClient from "@/lib/axios";
import type { SecureQuizPayload } from "@/lib/quizCrypto";

export interface SecureQuizPayloadMeta {
  exists: boolean;
  quizId?: number;
  payloadId?: string;
  version?: number;
  algorithm?: string;
  keyFingerprint?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedSecureQuizPayload {
  quizId: number;
  payloadId: string;
  version: number;
  algorithm: string;
  keyFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

interface SecureQuizPayloadResponse
  extends Omit<SecureQuizPayload, "quizId"> {
  quizId: string | number;
  payloadId?: string;
}

function quizPath(quizId: string | number): string {
  return `/v1/admin/quiz/${encodeURIComponent(String(quizId))}/secure-payload`;
}

/** Fetch only metadata (never ciphertext) for an encrypted quiz copy. */
export async function getSecureQuizMeta(
  quizId: string | number
): Promise<SecureQuizPayloadMeta> {
  const response = await apiClient.get<SecureQuizPayloadMeta>(
    `${quizPath(quizId)}/meta`
  );
  return response.data;
}

/** Fetch the ciphertext payload for an encrypted quiz copy. */
export async function getSecureQuizPayload(
  quizId: string | number
): Promise<SecureQuizPayload> {
  const response = await apiClient.get<SecureQuizPayloadResponse>(
    quizPath(quizId)
  );
  const data = response.data;
  return { ...data, quizId: String(data.payloadId ?? data.quizId) };
}

/** Upload ciphertext + the wrapped key. Plaintext is never sent. */
export async function saveSecureQuizPayload(
  quizId: string | number,
  payload: SecureQuizPayload
): Promise<SavedSecureQuizPayload> {
  const response = await apiClient.post<SavedSecureQuizPayload>(
    quizPath(quizId),
    payload
  );
  return response.data;
}

/** Remove the encrypted copy (the plaintext quiz is unaffected). */
export async function deleteSecureQuizPayload(
  quizId: string | number
): Promise<{ deleted: boolean }> {
  const response = await apiClient.delete<{ deleted: boolean }>(
    quizPath(quizId)
  );
  return response.data;
}
