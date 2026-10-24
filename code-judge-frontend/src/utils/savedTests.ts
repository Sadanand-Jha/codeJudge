import { getAuthHeaders } from "@/lib/authHeaders";
import type { QuestionPaper } from "@/components/creator/tests/sections/paperTypes";
import { withPaperHeaderDefaults, type PaperHeaderMeta } from "@/utils/paperHeader";

const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.quizsupport.com/api";
const API_BASE = rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "");
const SAVED_TESTS_PATH = "/v1/admin/tests/saved-papers";
const LEGACY_STORAGE_KEY = "quizsupport.creator.tests.v1";

export interface SavedTestSummary {
  id: number;
  draftId: string;
  title: string;
  creationType: string;
  duration: number;
  subjects: string[];
  sectionsCount: number;
  totalQuestions: number;
  totalMarks: number;
  meta: PaperHeaderMeta;
  createdAt: string;
  updatedAt: string;
}

export interface SavedTestRecord extends SavedTestSummary {
  paper: QuestionPaper | null;
}

export interface SaveTestRecordInput {
  draftId: string;
  title: string;
  creationType: string;
  duration: number;
  subjects: string[];
  sectionsCount: number;
  totalQuestions: number;
  totalMarks: number;
  meta: PaperHeaderMeta;
  paper: QuestionPaper;
}

async function savedTestsRequest(path = "", init?: RequestInit) {
  const response = await fetch(`${API_BASE}${SAVED_TESTS_PATH}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
      ...init?.headers,
    },
    credentials: "include",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    throw new Error(json.message || `Request failed with status ${response.status}`);
  }
  return json.data;
}

export async function getSavedTests(): Promise<SavedTestSummary[]> {
  const data = await savedTestsRequest();
  return data.tests ?? [];
}

export async function getSavedTest(id: number): Promise<SavedTestRecord> {
  const data = await savedTestsRequest(`/${id}`);
  return data.test;
}

export async function saveTestRecord(record: SaveTestRecordInput): Promise<SavedTestRecord> {
  const data = await savedTestsRequest("", { method: "POST", body: JSON.stringify(record) });
  return data.test;
}

export async function updateSavedTest(
  id: number,
  input: { title: string; meta: PaperHeaderMeta }
): Promise<SavedTestSummary> {
  const data = await savedTestsRequest(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.test;
}

export async function removeSavedTest(id: number): Promise<void> {
  await savedTestsRequest(`/${id}`, { method: "DELETE" });
}

interface LegacySavedTest {
  id?: unknown;
  title?: unknown;
  creationType?: unknown;
  duration?: unknown;
  subjects?: unknown;
  sectionsCount?: unknown;
  totalQuestions?: unknown;
  totalMarks?: unknown;
  meta?: unknown;
  paper?: QuestionPaper | null;
}

/**
 * Move papers created by the old browser-only implementation into the
 * account. Safe to call repeatedly: the server upserts by draft id.
 */
export async function migrateLegacySavedTests(): Promise<number> {
  if (typeof window === "undefined") return 0;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return 0;
  }
  if (!raw) return 0;

  let legacy: LegacySavedTest[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) legacy = parsed as LegacySavedTest[];
  } catch {
    return 0;
  }

  const records = legacy.filter((record) => record?.paper && Array.isArray(record.paper.sections));
  if (records.length === 0) {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return 0;
  }

  let migrated = 0;
  for (const [index, record] of records.entries()) {
    const paper = record.paper as QuestionPaper;
    const fallbackDraftId = `legacy-${Date.now()}-${index}`;
    const draftId = String(record.id ?? fallbackDraftId)
      .replace(/[^A-Za-z0-9._:-]/g, "-")
      .slice(0, 120) || fallbackDraftId;
    try {
      await saveTestRecord({
        draftId,
        title: String(record.title ?? paper.title ?? "Untitled test").trim() || "Untitled test",
        creationType: String(record.creationType ?? "test"),
        duration: Number(record.duration ?? paper.durationMinutes ?? 0),
        subjects: Array.isArray(record.subjects)
          ? record.subjects.filter((item): item is string => typeof item === "string")
          : [],
        sectionsCount: Number(record.sectionsCount ?? paper.sections.length),
        totalQuestions: Number(record.totalQuestions ?? paper.totalQuestions),
        totalMarks: Number(record.totalMarks ?? paper.totalMarks),
        meta: withPaperHeaderDefaults(
          record.meta && typeof record.meta === "object" ? record.meta as Partial<PaperHeaderMeta> : undefined
        ),
        paper,
      });
      migrated += 1;
    } catch {
      // Keep the legacy copy so a later visit can retry.
    }
  }

  if (migrated === records.length) {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }
  return migrated;
}
