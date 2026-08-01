/**
 * Shared avatar constants for DiceBear avatars
 * 
 * This file contains the predefined collection of 20 DiceBear avatars:
 * - 12 male-style avatars
 * - 8 female-style avatars
 * 
 * Both frontend and backend use this same list to ensure validation stays in sync.
 */

export const AVATAR_STYLE = "adventurer";

export const AVATAR_BASE_URL = `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg`;

/**
 * Collection of 20 predefined DiceBear avatars
 * 12 male-style, 8 female-style
 * All using the same adventurer style with unique seed values
 */
export const PREDEFINED_AVATARS: string[] = [
  // Male avatars (12)
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Alex",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Ryan",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Michael",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=David",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=James",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=John",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Robert",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=William",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Daniel",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Kevin",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Jason",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Chris",
  
  // Female avatars (8)
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Sarah",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Emma",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Olivia",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Emily",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Amanda",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Nicole",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Rachel",
];

/**
 * Validate if a URL is one of the predefined avatars
 */
export function isValidPredefinedAvatar(url: string | null | undefined): boolean {
  if (!url) return false;
  return PREDEFINED_AVATARS.includes(url);
}

/**
 * Get avatar URL by index (0-19)
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