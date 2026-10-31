import { cloudinary, getCloudinaryCredentials } from "../config/cloudinary.ts";
import {
  getEntitlements,
  type EffectiveEntitlements,
} from "./entitlement.service.ts";

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;
const ALLOWED_FORMAT_STRING = AVATAR_ALLOWED_FORMATS.join(",");

export class AvatarUploadError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AvatarUploadError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface AvatarUploadParams {
  timestamp: number;
  public_id: string;
  allowed_formats: string;
  tags: string;
  overwrite: string;
}

/** Custom photo uploads are a paid/trial perk — past-due and free plans are blocked. */
export function canChangeProfilePhoto(
  entitlements: Pick<EffectiveEntitlements, "isPaid" | "status">
): boolean {
  return (
    entitlements.isPaid &&
    (entitlements.status === "active" || entitlements.status === "trialing")
  );
}

export async function requireProfilePhotoAccess(userId: number | string): Promise<void> {
  const entitlements = await getEntitlements(userId);
  if (!canChangeProfilePhoto(entitlements)) {
    throw new AvatarUploadError(
      403,
      "PROFILE_PHOTO_PLAN_REQUIRED",
      "Profile photo uploads are available on paid plans and active trials."
    );
  }
}

export function avatarFolder(userId: number | string): string {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AvatarUploadError(400, "INVALID_USER", "A valid user is required.");
  }
  return `avatars/${id}`;
}

/** Keep the client-provided name but strip paths/extensions and unsafe chars. */
export function sanitizeAvatarFileName(fileName: unknown): string {
  if (typeof fileName !== "string") {
    throw new AvatarUploadError(400, "INVALID_FILE_NAME", "A file name is required.");
  }
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const withoutExtension = base.replace(/\.[a-z0-9]+$/i, "");
  const safe = withoutExtension
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (!safe) {
    throw new AvatarUploadError(400, "INVALID_FILE_NAME", "The file name is not valid.");
  }
  return safe;
}

export function avatarPublicId(userId: number | string, fileName: unknown): string {
  return `${avatarFolder(userId)}/${sanitizeAvatarFileName(fileName)}`;
}

function buildAvatarSignatureParams(
  userId: number | string,
  fileName: unknown,
  now: Date = new Date()
): AvatarUploadParams {
  const id = Number(userId);
  return {
    timestamp: Math.round(now.getTime() / 1000),
    public_id: avatarPublicId(id, fileName),
    allowed_formats: ALLOWED_FORMAT_STRING,
    tags: `avatar,user_${id}`,
    overwrite: "false",
  };
}

export function buildAvatarUploadSignature(userId: number | string, fileName: unknown) {
  const credentials = getCloudinaryCredentials();
  const params = buildAvatarSignatureParams(userId, fileName);
  const signature = cloudinary.utils.api_sign_request(
    params as unknown as Record<string, string | number>,
    credentials.apiSecret
  );

  return {
    timestamp: params.timestamp,
    publicId: params.public_id,
    allowedFormats: params.allowed_formats,
    tags: params.tags,
    overwrite: params.overwrite,
    signature,
    apiKey: credentials.apiKey,
    cloudName: credentials.cloudName,
  };
}

/** Accept only this user's direct Cloudinary uploads from our cloud. */
export function isOwnedAvatarUrl(url: string, userId: number | string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
    return false;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const id = Number(userId);
  if (!cloudName || !Number.isInteger(id) || id <= 0) return false;

  const prefix = `/${cloudName}/image/upload/`;
  if (!parsed.pathname.startsWith(prefix)) return false;

  const publicId = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, "");
  const folder = `avatars/${id}/`;
  return publicId.startsWith(folder) && publicId.length > folder.length;
}
