/**
 * Predefined Local Avatar Configuration
 *
 * The frontend uses only the seven predefined local avatar images
 * served from /images/avatar-1.png ... /images/avatar-7.png.
 *
 * IMPORTANT: This must stay in sync with the backend validation in
 * code-judge-backend/src/constants/avatars.ts and shared/constants/avatars.ts.
 */

export type AvatarGender = "male" | "female" | "neutral";

export interface PredefinedAvatar {
  /** Stable identifier, e.g. "avatar-1" */
  id: string;
  /** Display label, e.g. "Avatar 1" */
  label: string;
  gender: AvatarGender;
  /** Avatar ID number (1-7) */
  avatarId: number;
  /** Fully-resolved avatar URL */
  url: string;
}

/* =============================================
   Pre-generated avatar definitions
   ============================================= */

/** Total number of predefined avatars. */
export const AVATAR_COUNT = 7;

/** Base path for local avatar images. */
const AVATAR_BASE_PATH = "/images/avatar-";

function buildAvatarUrl(avatarId: number): string {
  return `${AVATAR_BASE_PATH}${avatarId}.png`;
}

function makeAvatar(
  id: string,
  label: string,
  gender: AvatarGender,
  avatarId: number
): PredefinedAvatar {
  return { id, label, gender, avatarId, url: buildAvatarUrl(avatarId) };
}

/* ----- 7 Local Avatars ----- */

const AVATARS: PredefinedAvatar[] = [
  makeAvatar("avatar-1", "Avatar 1", "male", 1),
  makeAvatar("avatar-2", "Avatar 2", "female", 2),
  makeAvatar("avatar-3", "Avatar 3", "male", 3),
  makeAvatar("avatar-4", "Avatar 4", "female", 4),
  makeAvatar("avatar-5", "Avatar 5", "male", 5),
  makeAvatar("avatar-6", "Avatar 6", "female", 6),
  makeAvatar("avatar-7", "Avatar 7", "neutral", 7),
];

/* =============================================
   Exports
   ============================================= */

/** Default avatar URL (first avatar). */
export const DEFAULT_AVATAR_URL = buildAvatarUrl(1);

/** All 7 pre-generated avatars. */
export const PREDEFINED_AVATARS: PredefinedAvatar[] = AVATARS;

/** Look up a pre-generated avatar by its stable id. */
export function getPredefinedAvatar(id: string | null | undefined): PredefinedAvatar | undefined {
  if (!id) return undefined;
  return PREDEFINED_AVATARS.find((a) => a.id === id);
}

/** Look up a pre-generated avatar by its URL. */
export function getPredefinedAvatarByUrl(url: string | null | undefined): PredefinedAvatar | undefined {
  if (!url) return undefined;
  return PREDEFINED_AVATARS.find((a) => a.url === url);
}

/** Get avatar URL by ID number (1-7). */
export function getAvatarUrlById(avatarId: number): string {
  const id = ((avatarId - 1) % AVATAR_COUNT + AVATAR_COUNT) % AVATAR_COUNT + 1;
  return buildAvatarUrl(id);
}

/** Get a random avatar URL (1-7). */
export function getRandomAvatarUrl(): string {
  const id = Math.floor(Math.random() * AVATAR_COUNT) + 1;
  return buildAvatarUrl(id);
}