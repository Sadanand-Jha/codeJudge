import { LETTERHEAD_MAX_BYTES } from "@/config/letterheads";

const MIME_BY_EXTENSION: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
};

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export function validateLetterheadFile(file: FileLike): { ok: boolean; error?: string } {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedMimes = MIME_BY_EXTENSION[extension];
  if (!allowedMimes) {
    return { ok: false, error: "Upload a PDF, PNG or JPG file." };
  }
  if (!file.type || !allowedMimes.includes(file.type.toLowerCase())) {
    return { ok: false, error: "The file type does not match its extension. Choose a valid PDF, PNG or JPG." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: "That file is empty. Choose another file." };
  }
  if (file.size > LETTERHEAD_MAX_BYTES) {
    return { ok: false, error: "Letterheads must be 10 MB or smaller." };
  }
  return { ok: true };
}
