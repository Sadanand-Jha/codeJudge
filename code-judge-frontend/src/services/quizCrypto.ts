import apiClient from "@/lib/axios";
import type { Envelope } from "@/lib/crypto";

export interface KekConfigPayload {
  salt: string;
  kdf: {
    algorithm: "PBKDF2-HMAC-SHA-256";
    iterations: number;
  };
  check: Envelope;
}

export interface KekConfigResponse {
  configured: boolean;
  salt?: string;
  kdf?: KekConfigPayload["kdf"];
  check?: Envelope | null;
}

export interface SecureTeacherQuestion {
  problemId: number;
  payloadAadId: string;
  payloadCt: Envelope | null;
  quizProblemType: number | null;
  questionNumber: number | null;
  marks: number | null;
  negativeMarks: number | null;
  difficulty: number | null;
  options: Array<{
    id: number;
    isCorrect: boolean;
    sortOrder: number;
    answerHash: string | null;
  }>;
}

export interface TeacherSecureContent {
  configured: boolean;
  cryptoVersion: number;
  wrappedDek: Envelope | null;
  problems: SecureTeacherQuestion[];
}

export interface SecureProblemInput {
  problemId?: number;
  payloadAadId: string;
  payloadCt: Envelope;
  quizProblemType: number;
  questionNumber: number;
  marks?: number;
  negativeMarks?: number;
  difficulty?: number;
  options: Array<{
    id?: number;
    isCorrect: boolean;
    answerHash?: string | null;
  }>;
}

export interface SaveSecureContentInput {
  wrappedDek?: Envelope;
  problems: SecureProblemInput[];
}

export interface SavedSecureProblem {
  problemId: number;
  payloadAadId: string;
  options: Array<{ id: number; sortOrder: number }>;
}

export interface StudentSecureProblem {
  id: number;
  payloadAadId: string;
  payloadCt: Envelope;
  quizProblemType: number | null;
  questionNumber: number | null;
  marks: number | null;
  negativeMarks: number | null;
  difficulty: number | null;
  options: Array<{ id: number; authoredIndex: number }>;
}

export interface StudentSecureContent {
  configured: boolean;
  cryptoVersion: number;
  problems: StudentSecureProblem[];
}

export async function getKekConfig(): Promise<KekConfigResponse> {
  const response = await apiClient.get<KekConfigResponse>("/v1/user/quiz-crypto/kek");
  return response.data;
}

export async function saveKekConfig(
  config: KekConfigPayload
): Promise<KekConfigResponse> {
  const response = await apiClient.put<KekConfigResponse>(
    "/v1/user/quiz-crypto/kek",
    config
  );
  return response.data;
}

export async function getTeacherSecureContent(
  quizId: string | number
): Promise<TeacherSecureContent> {
  const response = await apiClient.get<TeacherSecureContent>(
    `/v1/admin/quiz/${encodeURIComponent(String(quizId))}/client-crypto`
  );
  return response.data;
}

export async function saveTeacherSecureContent(
  quizId: string | number,
  input: SaveSecureContentInput
): Promise<{ cryptoVersion: number; problems: SavedSecureProblem[] }> {
  const response = await apiClient.put<{
    cryptoVersion: number;
    problems: SavedSecureProblem[];
  }>(
    `/v1/admin/quiz/${encodeURIComponent(String(quizId))}/client-crypto`,
    input
  );
  return response.data;
}

export async function getStudentSecureContent(
  quizId: string | number
): Promise<StudentSecureContent> {
  const response = await apiClient.get<StudentSecureContent>(
    `/v1/user/quiz/${encodeURIComponent(String(quizId))}/client-crypto`
  );
  return response.data;
}
