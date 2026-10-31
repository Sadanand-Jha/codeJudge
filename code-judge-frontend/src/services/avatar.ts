import apiClient from "@/lib/axios";

interface UpdateAvatarResponse {
  avatarUrl: string;
}

export interface AvatarUploadSignature {
  timestamp: number;
  publicId: string;
  allowedFormats: string;
  tags: string;
  overwrite: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}

export interface AvatarUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  signature?: string;
}

export class AvatarUploadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AvatarUploadError";
    this.status = status;
  }
}

/**
 * Update user avatar
 * PATCH /api/v1/user/avatar
 */
export async function updateAvatar(avatarUrl: string): Promise<string> {
  const response = await apiClient.patch<UpdateAvatarResponse>("/v1/user/avatar", {
    avatarUrl,
  });
  return response.data.avatarUrl;
}

/**
 * Ask the backend to sign a direct Cloudinary upload. Only the signature
 * request reaches our API — the image itself goes browser → Cloudinary.
 */
export async function getAvatarUploadSignature(fileName: string): Promise<AvatarUploadSignature> {
  const response = await apiClient.post<AvatarUploadSignature>(
    "/v1/user/uploads/cloudinary/avatar-signature",
    { fileName }
  );
  return response.data;
}

interface RawCloudinaryResponse {
  public_id?: string;
  secure_url?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  signature?: string;
  error?: { message?: string };
}

function uploadOnce(
  file: File,
  signature: AvatarUploadSignature,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<AvatarUploadResult> {
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
      reject(new AvatarUploadError("Could not reach Cloudinary. Check your connection."));
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
          new AvatarUploadError(
            payload?.error?.message || "Cloudinary rejected the upload.",
            xhr.status
          )
        );
        return;
      }

      if (!payload.public_id || !payload.secure_url) {
        reject(new AvatarUploadError("Cloudinary returned an incomplete upload response."));
        return;
      }

      onProgress?.(100);
      resolve({
        publicId: payload.public_id,
        secureUrl: payload.secure_url,
        format: payload.format ?? "",
        width: Number(payload.width ?? 0),
        height: Number(payload.height ?? 0),
        bytes: Number(payload.bytes ?? 0),
        signature: payload.signature,
      });
    };

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("public_id", signature.publicId);
    form.append("allowed_formats", signature.allowedFormats);
    form.append("tags", signature.tags);
    form.append("overwrite", signature.overwrite);
    form.append("signature", signature.signature);
    xhr.send(form);
  });
}

function isExpiredSignature(error: unknown): boolean {
  if (!(error instanceof AvatarUploadError) || error.status !== 400) return false;
  return /timestamp|stale|signature/i.test(error.message);
}

/**
 * Upload the (already renamed) avatar straight to Cloudinary using a short-lived
 * backend signature, retrying once when the signature has gone stale.
 */
export async function uploadAvatarFile(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<AvatarUploadResult> {
  const signature = await getAvatarUploadSignature(file.name);
  try {
    return await uploadOnce(file, signature, onProgress, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (!isExpiredSignature(error)) throw error;
    const refreshed = await getAvatarUploadSignature(file.name);
    return uploadOnce(file, refreshed, onProgress, signal);
  }
}
