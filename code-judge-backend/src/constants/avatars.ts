/**
 * Avatar constants for local avatar images
 *
 * This file contains the predefined collection of 7 local avatars
 * served from the frontend at /images/avatar-1.png ... /images/avatar-7.png.
 *
 * IMPORTANT: This must match the frontend config at code-judge-frontend/src/config/dicebear.ts
 * Keep both files in sync when updating the avatar list.
 */

export const AVATAR_STYLE = "local";

/**
 * Base path for local avatar images (served by the frontend).
 */
export const AVATAR_BASE_URL = "/images/avatar-";

/**
 * Total number of predefined avatars.
 */
export const AVATAR_COUNT = 7;

/**
 * Build a local avatar URL by ID (1-7)
 */
function buildAvatarUrl(id: number): string {
  return `${AVATAR_BASE_URL}${id}.png`;
}

/**
 * Collection of 7 predefined local avatars
 */
export const PREDEFINED_AVATARS: string[] = Array.from(
  { length: AVATAR_COUNT },
  (_, i) => buildAvatarUrl(i + 1)
);

/**
 * Validate if a URL is one of the predefined avatars
 */
export function isValidPredefinedAvatar(url: string | null | undefined): boolean {
  if (!url) return false;
  return PREDEFINED_AVATARS.includes(url);
}

/**
 * Get avatar URL by index (0-20)
 */
export function getAvatarByIndex(index: number): string | null {
  if (index < 0 || index >= PREDEFINED_AVATARS.length) {
    return null;
  }
  return PREDEFINED_AVATARS[index];
}

/**
 * Get index of a predefined avatar URL
 * Returns -1 if not found
 */
export function getAvatarIndex(url: string): number {
  return PREDEFINED_AVATARS.indexOf(url);
}