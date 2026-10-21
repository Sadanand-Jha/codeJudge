import type { QuestionPaper } from "@/components/creator/tests/sections/paperTypes";
import type { PaperHeaderMeta } from "@/utils/paperHeader";

export interface SavedTestRecord {
  id: string;
  title: string;
  creationType: string;
  createdAt: string;
  mode: "free" | "paid";
  price: number;
  originalPrice: number;
  duration: number;
  subjects: string[];
  sectionsCount: number;
  totalQuestions: number;
  totalMarks: number;
  meta: PaperHeaderMeta;
  paper: QuestionPaper | null;
}

const STORAGE_KEY = "quizsupport.creator.tests.v1";
const CHANGE_EVENT = "quizsupport-saved-tests";
const EMPTY_TESTS: SavedTestRecord[] = [];

let cachedRaw: string | null = null;
let cachedTests: SavedTestRecord[] = EMPTY_TESTS;

export function getSavedTests(): SavedTestRecord[] {
  if (typeof window === "undefined") return EMPTY_TESTS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_TESTS;
  }
  if (raw === cachedRaw) return cachedTests;
  cachedRaw = raw;
  if (!raw) {
    cachedTests = EMPTY_TESTS;
    return cachedTests;
  }
  try {
    const parsed = JSON.parse(raw) as SavedTestRecord[];
    cachedTests = Array.isArray(parsed) ? parsed : EMPTY_TESTS;
  } catch {
    cachedTests = EMPTY_TESTS;
  }
  return cachedTests;
}

export function getSavedTestsServerSnapshot(): SavedTestRecord[] {
  return EMPTY_TESTS;
}

export function saveTestRecord(record: SavedTestRecord): SavedTestRecord[] {
  if (typeof window === "undefined") return [];
  const next = [record, ...getSavedTests().filter((item) => item.id !== record.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return next;
}

export function removeSavedTest(id: string): SavedTestRecord[] {
  if (typeof window === "undefined") return [];
  const next = getSavedTests().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return next;
}

export function subscribeSavedTests(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
