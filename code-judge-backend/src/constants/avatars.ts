/**
 * Avatar constants for DiceBear avatars
 * 
 * This file contains the predefined collection of 20 DiceBear avatars:
 * - 12 male-style avatars
 * - 8 female-style avatars
 * 
 * IMPORTANT: This must match the frontend config at code-judge-frontend/src/config/dicebear.ts
 * Keep both files in sync when updating the avatar list.
 */

export const AVATAR_STYLE = "avataaars";

export const AVATAR_BASE_URL = `https://api.dicebear.com/7.x/${AVATAR_STYLE}/svg`;

function buildAvatarUrl(seed: string): string {
  return `${AVATAR_BASE_URL}?seed=${encodeURIComponent(seed)}`;
}

/**
 * Collection of 20 predefined DiceBear avatars
 * 12 male-style, 8 female-style
 * All using the same avataaars style with unique seed values
 */
export const PREDEFINED_AVATARS: string[] = [
  // Male avatars (12)
  buildAvatarUrl("AlexKing"),
  buildAvatarUrl("RyanCole"),
  buildAvatarUrl("DevShah"),
  buildAvatarUrl("MaxPower"),
  buildAvatarUrl("LeoNguyen"),
  buildAvatarUrl("OmarKhan"),
  buildAvatarUrl("SamBolt"),
  buildAvatarUrl("JakeFrost"),
  buildAvatarUrl("TomReed"),
  buildAvatarUrl("EliStone"),
  buildAvatarUrl("RajVerma"),
  buildAvatarUrl("KaiLiu"),
  
  // Female avatars (8)
  buildAvatarUrl("MiaChen"),
  buildAvatarUrl("AriaPatel"),
  buildAvatarUrl("ZoeMartin"),
  buildAvatarUrl("LilyWalsh"),
  buildAvatarUrl("NoraBloom"),
  buildAvatarUrl("IvyClark"),
  buildAvatarUrl("MayaSingh"),
  buildAvatarUrl("EvaHart"),
];

/**
 * Validate if a URL is one of the predefined avatars
 */
export function isValidPredefinedAvatar(url: string | null | undefined): boolean {
  if (!url) return false;
  return PREDEFINED_AVATARS.includes(url);
}
