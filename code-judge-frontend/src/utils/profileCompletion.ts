import type { UserProfile } from "@/store/authStore";

export const PROFILE_EDIT_PATH = "/settings#profile";

export function hasProfileFullName(
  user: Pick<UserProfile, "displayName" | "firstName" | "lastName"> | null | undefined
): boolean {
  if (!user) return false;
  if (user.displayName?.trim()) return true;
  return Boolean(user.firstName?.trim() || user.lastName?.trim());
}

export function needsProfileCompletion(
  user: Pick<UserProfile, "role" | "displayName" | "firstName" | "lastName"> | null | undefined
): boolean {
  if (!user) return false;
  if ((user.role ?? "").trim().toLowerCase() !== "student") return false;
  return !hasProfileFullName(user);
}
