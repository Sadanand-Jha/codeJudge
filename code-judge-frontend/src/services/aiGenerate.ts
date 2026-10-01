import type { AIGenerateResponse } from "@/components/creator/tests/sections/aiTypes";
import { getAuthHeaders } from "@/lib/authHeaders";
import type {
  GeneratePaperPayload,
  GeneratePaperResponse,
  GenerateQuestionsPayload,
  GenerateQuestionsResponse,
  QuestionPaper,
} from "@/components/creator/tests/sections/paperTypes";
import type { Section } from "@/components/creator/tests/sections/types";

const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://quizbackend-dun.vercel.app/api";
const API_BASE = rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "");

export interface QuestionGeneratorCatalog {
  subjects: Array<{ id: number; name: string }>;
  chapters: Array<{ id: number; subjectId: number; name: string }>;
  topics: Array<{ id: number; chapterId: number; name: string }>;
  difficulties: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
}

export interface SectionBlueprint {
  id: number;
  name: string;
  description: string;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

async function blueprintRequest(path = "", init?: RequestInit) {
  const response = await fetch(`${API_BASE}/v1/admin/tests/section-blueprints${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...getAuthHeaders(), ...init?.headers },
    credentials: "include",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) throw new Error(json.message || `Request failed with status ${response.status}`);
  return json.data;
}

export async function getSectionBlueprints(): Promise<SectionBlueprint[]> {
  const data = await blueprintRequest();
  return data.blueprints ?? [];
}

export async function saveSectionBlueprint(payload: { name: string; description?: string; sections: Section[] }): Promise<SectionBlueprint> {
  const data = await blueprintRequest("", { method: "POST", body: JSON.stringify(payload) });
  return data.blueprint;
}

export async function useSectionBlueprint(id: number): Promise<SectionBlueprint> {
  const data = await blueprintRequest(`/${id}/use`, { method: "POST" });
  return data.blueprint;
}

export async function deleteSectionBlueprint(id: number): Promise<void> {
  await blueprintRequest(`/${id}`, { method: "DELETE" });
}

export async function getQuestionGeneratorCatalog(signal?: AbortSignal): Promise<QuestionGeneratorCatalog> {
  const response = await fetch(`${API_BASE}/v1/admin/tests/question-generator/catalog`, {
    headers: getAuthHeaders(),
    credentials: "include",
    signal,
  });
  const json = await response.json();
  if (!response.ok || json.success === false) {
    throw new Error(json.message || `Request failed with status ${response.status}`);
  }
  return json.data;
}

/**
 * Upload one or more verified study files and generate a test structure using AI.
 *
 * Uses native fetch instead of the shared axios client to ensure
 * multipart/form-data boundary is set correctly by the browser.
 *
 * POST /api/v1/admin/tests/generate-sections
 */
export async function generateTestSectionsFromPDF(
  files: File[],
  signal?: AbortSignal
): Promise<AIGenerateResponse> {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);

  const response = await fetch(`${API_BASE}/v1/admin/tests/generate-sections`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
    credentials: "include",
    signal,
  });

  const json = await response.json();

  if (!response.ok || json.success === false) {
    throw new Error(json.message || `Request failed with status ${response.status}`);
  }

  return json.data;
}

/**
 * Generate a full question paper from created sections + syllabus.
 * The backend pairs the sections with the curated subjective bank and
 * asks the AI to select questions per section/group.
 *
 * POST /api/v1/admin/tests/generate-paper
 */
export async function generateQuestionPaper(
  payload: GeneratePaperPayload,
  signal?: AbortSignal
): Promise<GeneratePaperResponse> {
  const response = await fetch(`${API_BASE}/v1/admin/tests/generate-paper`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
    signal,
  });

  const json = await response.json();

  if (!response.ok || json.success === false) {
    throw new Error(json.message || `Request failed with status ${response.status}`);
  }

  return json.data;
}

/**
 * Download a generated paper as a Word (.docx) file.
 *
 * POST /api/v1/admin/tests/paper-download
 */
export async function downloadQuestionPaper(
  paper: QuestionPaper,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/admin/tests/paper-download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ paper }),
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const json = await response.json();
      message = json.message || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "question-paper.docx";
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Pick N subjective questions with a hardness split + topic.
 * The backend asks the AI to select the perfect questions from the bank.
 *
 * POST /api/v1/admin/tests/generate-questions
 */
export async function generateSubjectiveQuestions(
  payload: GenerateQuestionsPayload,
  signal?: AbortSignal
): Promise<GenerateQuestionsResponse> {
  const response = await fetch(`${API_BASE}/v1/admin/tests/generate-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
    signal,
  });

  const json = await response.json();

  if (!response.ok || json.success === false) {
    throw new Error(json.message || `Request failed with status ${response.status}`);
  }

  return json.data;
}
