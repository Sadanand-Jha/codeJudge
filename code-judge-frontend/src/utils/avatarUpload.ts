export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface AvatarFileLike {
  name: string;
  type: string;
  size: number;
}

export function validateAvatarFile(file: AvatarFileLike): { ok: boolean; error?: string } {
  if (!file.type || !EXTENSION_BY_MIME[file.type]) {
    return { ok: false, error: "Upload a PNG, JPG or WebP image." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: "That image is empty. Choose another file." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Profile photos must be 5 MB or smaller." };
  }
  return { ok: true };
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function timestampSlug(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
}

/**
 * Rename the image on the client before it is signed/uploaded. Cloudinary keeps
 * this public id, so the stored asset is named after the creator — not
 * "Screenshot 2026-10-31 at 10.42.11.png".
 */
export function renameAvatarFile(
  file: File,
  options: { userId: string; displayName: string; now?: Date }
): File {
  const extension = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const userPart = options.userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "user";
  const namePart = slugify(options.displayName) || "creator";
  const randomPart = Math.random().toString(36).slice(2, 8);
  const fileName = `creator-${userPart}-${namePart}-${timestampSlug(options.now ?? new Date())}-${randomPart}.${extension}`;

  return new File([file], fileName, {
    type: file.type,
    lastModified: file.lastModified,
  });
}
