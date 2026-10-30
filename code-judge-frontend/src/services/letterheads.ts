import apiClient from "@/lib/axios";
import { buildCloudinaryPreviewUrl } from "@/utils/letterheadLayout";
import type {
  CloudinaryUploadAsset,
  HeaderConfig,
  HeaderUploadSignature,
  Letterhead,
} from "@/types/letterhead";

export const LETTERHEADS_CHANGED_EVENT = "quizsupport:letterheads-changed";

export interface LetterheadUsage {
  count: number;
  max: number;
  remaining: number;
}

export interface LetterheadListResponse {
  letterheads: Letterhead[];
  usage: LetterheadUsage;
}

export class CloudinaryUploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "CloudinaryUploadError";
    this.status = status;
  }
}

export function notifyLetterheadsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LETTERHEADS_CHANGED_EVENT));
}

export async function listLetterheads(): Promise<LetterheadListResponse> {
  const response = await apiClient.get<LetterheadListResponse>("/v1/user/letterheads");
  return response.data;
}

export async function getLetterheadUploadSignature(): Promise<HeaderUploadSignature> {
  const response = await apiClient.post<HeaderUploadSignature>(
    "/v1/user/uploads/cloudinary/signature"
  );
  return response.data;
}

interface RawCloudinaryResponse {
  public_id?: string;
  version?: number;
  secure_url?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  pages?: number;
  original_filename?: string;
  signature?: string;
  error?: { message?: string };
}

function toUploadAsset(
  result: RawCloudinaryResponse,
  cloudName: string
): CloudinaryUploadAsset {
  const publicId = result.public_id;
  const version = Number(result.version);
  const secureUrl = result.secure_url;
  const format = String(result.format ?? "").toLowerCase();
  if (!publicId || !Number.isFinite(version) || !secureUrl || !format) {
    throw new CloudinaryUploadError("Cloudinary returned an incomplete upload response.");
  }
  return {
    publicId,
    version,
    secureUrl,
    format,
    width: Number(result.width ?? 0),
    height: Number(result.height ?? 0),
    bytes: Number(result.bytes ?? 0),
    pages: result.pages == null ? undefined : Number(result.pages),
    originalFilename: result.original_filename,
    signature: result.signature,
    // Keep the preview URL alongside the asset so callers do not need the
    // signature response again.
    previewUrl:
      format === "pdf"
        ? buildCloudinaryPreviewUrl(cloudName, publicId)
        : secureUrl,
  };
}

function uploadOnce(
  file: File,
  signature: HeaderUploadSignature,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<CloudinaryUploadAsset> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`
    );
    xhr.responseType = "json";

    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort, { once: true });

    const cleanup = () => signal?.removeEventListener("abort", abort);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new CloudinaryUploadError("Could not reach Cloudinary. Check your connection."));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    xhr.onload = () => {
      cleanup();
      const payload = (xhr.response ??
        (() => {
          try {
            return JSON.parse(xhr.responseText);
          } catch {
            return {};
          }
        })()) as RawCloudinaryResponse;
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new CloudinaryUploadError(
            payload?.error?.message || "Cloudinary rejected the upload.",
            xhr.status
          )
        );
        return;
      }
      try {
        onProgress?.(100);
        resolve(toUploadAsset(payload, signature.cloudName));
      } catch (error) {
        reject(error);
      }
    };

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("folder", signature.folder);
    form.append("allowed_formats", signature.allowed_formats);
    form.append("tags", signature.tags);
    form.append("overwrite", signature.overwrite);
    form.append("signature", signature.signature);
    xhr.send(form);
  });
}

function isExpiredSignature(error: unknown): boolean {
  if (!(error instanceof CloudinaryUploadError) || error.status !== 400) return false;
  return /timestamp|stale|signature/i.test(error.message);
}

/** Upload directly to Cloudinary (never through our API), retrying one expired signature. */
export async function uploadLetterheadFile(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<CloudinaryUploadAsset> {
  const signature = await getLetterheadUploadSignature();
  try {
    return await uploadOnce(file, signature, onProgress, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (!isExpiredSignature(error)) throw error;
    const refreshed = await getLetterheadUploadSignature();
    return await uploadOnce(file, refreshed, onProgress, signal);
  }
}

export async function createLetterhead(input: {
  name: string;
  asset: CloudinaryUploadAsset;
  headerConfig: HeaderConfig;
}): Promise<Letterhead> {
  const response = await apiClient.post<{ letterhead: Letterhead }>(
    "/v1/user/letterheads",
    {
      name: input.name,
      publicId: input.asset.publicId,
      version: input.asset.version,
      signature: input.asset.signature,
      headerConfig: input.headerConfig,
    }
  );
  return response.data.letterhead;
}

export async function updateLetterhead(
  id: number,
  patch: { name?: string; headerConfig?: HeaderConfig; isDefault?: boolean }
): Promise<Letterhead> {
  const response = await apiClient.patch<{ letterhead: Letterhead }>(
    `/v1/user/letterheads/${id}`,
    patch
  );
  return response.data.letterhead;
}

export async function deleteLetterhead(
  id: number
): Promise<{ deletedId: number; newDefaultId: number | null }> {
  const response = await apiClient.delete<{ deletedId: number; newDefaultId: number | null }>(
    `/v1/user/letterheads/${id}`
  );
  return response.data;
}

export async function getDefaultLetterhead(): Promise<Letterhead | null> {
  const { letterheads } = await listLetterheads();
  return letterheads.find((letterhead) => letterhead.isDefault) ?? null;
}
