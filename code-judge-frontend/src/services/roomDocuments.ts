import apiClient from "@/lib/axios";

export const ROOM_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

export const ROOM_DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg";

export const ROOM_DOCUMENT_FORMATS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "csv",
  "png",
  "jpg",
  "jpeg",
] as const;

export interface RoomDocument {
  id: string;
  roomId: string;
  name: string;
  format: string;
  type: string;
  mimeType: string;
  bytes: number;
  addedAt: string;
  uploadedBy: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
}

export interface RoomDocumentUploadSignature {
  timestamp: number;
  folder: string;
  allowed_formats: string;
  tags: string;
  overwrite: string;
  use_filename: string;
  unique_filename: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}

export class RoomDocumentUploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "RoomDocumentUploadError";
    this.status = status;
  }
}

interface RawCloudinaryRawResponse {
  public_id?: string;
  version?: number;
  secure_url?: string;
  format?: string;
  bytes?: number;
  original_filename?: string;
  signature?: string;
  error?: { message?: string };
}

export function formatDocumentSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function roomDocumentExtension(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return ROOM_DOCUMENT_FORMATS.includes(extension as (typeof ROOM_DOCUMENT_FORMATS)[number])
    ? extension
    : "";
}

export async function listRoomDocuments(roomId: string): Promise<RoomDocument[]> {
  const response = await apiClient.get<RoomDocument[]>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/documents`
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function getRoomDocumentUploadSignature(
  roomId: string
): Promise<RoomDocumentUploadSignature> {
  const response = await apiClient.post<RoomDocumentUploadSignature>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/documents/upload-signature`
  );
  return response.data;
}

function uploadOnce(
  roomId: string,
  file: File,
  signature: RoomDocumentUploadSignature,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<RoomDocument> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/raw/upload`
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
      reject(
        new RoomDocumentUploadError(
          "Could not reach Cloudinary. Check your connection."
        )
      );
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
        })()) as RawCloudinaryRawResponse;
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new RoomDocumentUploadError(
            payload?.error?.message || "Cloudinary rejected the upload.",
            xhr.status
          )
        );
        return;
      }

      const publicId = payload.public_id;
      const version = Number(payload.version);
      const uploadSignature = payload.signature;
      if (!publicId || !Number.isInteger(version) || !uploadSignature) {
        reject(
          new RoomDocumentUploadError(
            "Cloudinary returned an incomplete upload response."
          )
        );
        return;
      }

      apiClient
        .post<RoomDocument>(
          `/v1/user/rooms/${encodeURIComponent(roomId)}/documents`,
          {
            publicId,
            version,
            signature: uploadSignature,
            originalFilename: payload.original_filename,
            format: payload.format,
          }
        )
        .then((response) => {
          onProgress?.(100);
          resolve(response.data);
        })
        .catch((error: unknown) => {
          reject(
            new RoomDocumentUploadError(
              axiosMessage(error, "The document could not be saved.")
            )
          );
        });
    };

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("folder", signature.folder);
    form.append("allowed_formats", signature.allowed_formats);
    form.append("tags", signature.tags);
    form.append("overwrite", signature.overwrite);
    form.append("use_filename", signature.use_filename);
    form.append("unique_filename", signature.unique_filename);
    form.append("signature", signature.signature);
    xhr.send(form);
  });
}

function axiosMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isExpiredSignature(error: unknown): boolean {
  if (!(error instanceof RoomDocumentUploadError) || error.status !== 400) return false;
  return /timestamp|stale|signature/i.test(error.message);
}

export async function uploadRoomDocument(
  roomId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<RoomDocument> {
  if (file.size > ROOM_DOCUMENT_MAX_BYTES) {
    throw new RoomDocumentUploadError("Documents must be 25 MB or smaller.");
  }
  if (!roomDocumentExtension(file.name)) {
    throw new RoomDocumentUploadError(
      "Upload a PDF, Office document, text file or image."
    );
  }

  const signature = await getRoomDocumentUploadSignature(roomId);
  try {
    return await uploadOnce(roomId, file, signature, onProgress, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (!isExpiredSignature(error)) throw error;
    const refreshed = await getRoomDocumentUploadSignature(roomId);
    return uploadOnce(roomId, file, refreshed, onProgress, signal);
  }
}

export async function fetchRoomDocumentPreview(
  roomId: string,
  documentId: string
): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/documents/${encodeURIComponent(documentId)}/preview`,
    { responseType: "blob" }
  );
  return response.data;
}

export async function deleteRoomDocument(
  roomId: string,
  documentId: string
): Promise<{ deletedId: string }> {
  const response = await apiClient.delete<{ deletedId: string }>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/documents/${encodeURIComponent(documentId)}`
  );
  return response.data;
}

export async function downloadRoomDocument(
  roomId: string,
  documentId: string,
  filename: string
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/documents/${encodeURIComponent(documentId)}/download`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
