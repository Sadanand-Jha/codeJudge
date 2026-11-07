import apiClient, { API_BASE } from "@/lib/axios";

export type SyllabusScope = "system" | "teacher";
export type SyllabusStatus = "draft" | "active";
export type SyllabusSearchType = "syllabus" | "chapter" | "topic";
export type SyllabusVariantKey = "balanced";

export interface SyllabusMetadata {
  name: string;
  subject: string;
  board: string | null;
  classLevel: string | null;
  level: string | null;
  status: SyllabusStatus;
}

export interface SyllabusSummary extends SyllabusMetadata {
  id: number;
  ownerTeacherId: number | null;
  scope: SyllabusScope;
  sourceFileRef: string | null;
  importJobId: string | null;
  chapterCount: number;
  topicCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyllabusTopicNode {
  id?: number;
  title: string;
  position?: number;
}

export interface SyllabusChapterNode {
  id?: number;
  title: string;
  description?: string | null;
  position?: number;
  topics: SyllabusTopicNode[];
}

export interface SyllabusTree extends SyllabusMetadata {
  id: number;
  ownerTeacherId: number | null;
  scope: SyllabusScope;
  sourceFileRef: string | null;
  importJobId: string | null;
  createdAt: string;
  updatedAt: string;
  chapters: SyllabusChapterNode[];
}

export interface SyllabusSearchItem {
  type: SyllabusSearchType;
  id: number;
  scope: SyllabusScope;
  name: string;
  subject: string;
  syllabusId: number;
  syllabusName: string;
  chapterId: number | null;
  chapterName: string | null;
  owned: boolean;
}

export interface SyllabusSavePayload {
  name: string;
  subject: string;
  board?: string | null;
  classLevel?: string | null;
  level?: string | null;
  status?: SyllabusStatus;
  importJobId?: string | null;
  chapters: Array<{
    title: string;
    description?: string | null;
    topics: Array<{ title: string }>;
  }>;
}

export interface GeneratedSyllabusVariant {
  name: string;
  subject: string;
  board: string | null;
  classLevel: string | null;
  level: string | null;
  chapters: Array<{
    title: string;
    description: string | null;
    topics: Array<{ title: string }>;
  }>;
}

export interface SyllabusImportCost {
  creditCost: number;
  maxBytes: number;
  maxImportsPerHour: number;
  allowedExtensions: string[];
}

export interface SyllabusImportJob {
  id: string;
  status: "queued" | "processing" | "ready" | "failed";
  progress: number;
  creditCost: number;
  creditsUsed: number;
  originalFilename: string;
  errorMessage: string | null;
  variants: Record<SyllabusVariantKey, GeneratedSyllabusVariant[]> | null;
  streamText: string | null;
  createdAt: string;
  updatedAt: string;
}

type RawVariantMap = Partial<Record<SyllabusVariantKey, unknown>> | null;

function normalizeVariants(raw: unknown): Record<SyllabusVariantKey, GeneratedSyllabusVariant[]> | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as RawVariantMap;
  const toList = (value: unknown): GeneratedSyllabusVariant[] => {
    if (Array.isArray(value)) return value as GeneratedSyllabusVariant[];
    return value ? [value as GeneratedSyllabusVariant] : [];
  };
  const balanced = toList(source?.balanced);
  return balanced.length > 0 ? { balanced } : null;
}

function normalizeJob(job: SyllabusImportJob): SyllabusImportJob {
  return { ...job, variants: normalizeVariants(job.variants) };
}

export function getSyllabusImportStreamUrl(jobId: string): string {
  return `${API_BASE}/v1/user/syllabus/import/${encodeURIComponent(jobId)}/stream`;
}

export async function listSyllabi(query = ""): Promise<SyllabusSummary[]> {
  const response = await apiClient.get<SyllabusSummary[]>("/v1/user/syllabus", {
    params: query ? { q: query } : undefined,
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function getSyllabus(id: number): Promise<SyllabusTree> {
  const response = await apiClient.get<SyllabusTree>(`/v1/user/syllabus/${id}`);
  return response.data;
}

export async function searchSyllabus(params: {
  q?: string;
  type?: SyllabusSearchType;
  syllabusId?: number | null;
  chapterId?: number | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<SyllabusSearchItem[]> {
  const response = await apiClient.get<SyllabusSearchItem[]>("/v1/user/syllabus/search", {
    params: {
      q: params.q || undefined,
      type: params.type,
      syllabus_id: params.syllabusId ?? undefined,
      chapter_id: params.chapterId ?? undefined,
      limit: params.limit,
    },
    signal: params.signal,
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function createSyllabus(payload: SyllabusSavePayload): Promise<SyllabusTree> {
  const response = await apiClient.post<SyllabusTree>("/v1/user/syllabus", payload);
  return response.data;
}

export async function updateSyllabus(
  id: number,
  payload: SyllabusSavePayload
): Promise<SyllabusTree> {
  const response = await apiClient.put<SyllabusTree>(`/v1/user/syllabus/${id}`, payload);
  return response.data;
}

export async function renameSyllabus(id: number, name: string): Promise<SyllabusTree> {
  const response = await apiClient.patch<SyllabusTree>(`/v1/user/syllabus/${id}/rename`, {
    name,
  });
  return response.data;
}

export async function deleteSyllabus(id: number): Promise<void> {
  await apiClient.delete(`/v1/user/syllabus/${id}`);
}

export async function getSyllabusImportCost(): Promise<SyllabusImportCost> {
  const response = await apiClient.get<SyllabusImportCost>("/v1/user/syllabus/import/cost");
  return response.data;
}

export async function startSyllabusImport(file: File): Promise<SyllabusImportJob> {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post<SyllabusImportJob>(
    "/v1/user/syllabus/import",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return normalizeJob(response.data);
}

export async function getSyllabusImportJob(jobId: string): Promise<SyllabusImportJob> {
  const response = await apiClient.get<SyllabusImportJob>(
    `/v1/user/syllabus/import/${encodeURIComponent(jobId)}`
  );
  return normalizeJob(response.data);
}

export function variantToSavePayload(
  variant: GeneratedSyllabusVariant,
  importJobId: string | null
): SyllabusSavePayload {
  return {
    name: variant.name,
    subject: variant.subject,
    board: variant.board,
    classLevel: variant.classLevel,
    level: variant.level,
    status: "active",
    importJobId,
    chapters: variant.chapters.map((chapter) => ({
      title: chapter.title,
      description: chapter.description,
      topics: chapter.topics.map((topic) => ({ title: topic.title })),
    })),
  };
}
