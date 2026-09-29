/**
 * Shared avatar constants for local avatar images
 *
 * This file contains the predefined collection of 6 local avatars
 * served from the frontend at /images/avatar-1.png ... /images/avatar-6.png.
 *
 * Both frontend and backend use this same list to ensure validation stays in sync.
 */

export const AVATAR_STYLE = "local";

/**
 * Base path for local avatar images (served by the frontend).
 */
export const AVATAR_BASE_URL = "/images/avatar-";

/**
 * Total number of predefined avatars.
 */
export const AVATAR_COUNT = 6;

/**
 * Build a local avatar URL by ID (1-6)
 */
function buildAvatarUrl(id: number): string {
  return `${AVATAR_BASE_URL}${id}.png`;
}

/**
 * Collection of 6 predefined local avatars
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