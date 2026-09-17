import type { AIGenerateResponse } from "@/components/creator/tests/sections/aiTypes";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Upload a PDF and generate a test structure using AI.
 *
 * Uses native fetch instead of the shared axios client to ensure
 * multipart/form-data boundary is set correctly by the browser.
 *
 * POST /api/v1/admin/tests/generate-sections
 */
export async function generateTestSectionsFromPDF(
  file: File,
  signal?: AbortSignal
): Promise<AIGenerateResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/v1/admin/tests/generate-sections`, {
    method: "POST",
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
