// Public signup may only create student or teacher accounts. Admin/owner
// personas are provisioned separately and must never be selectable by clients.
export const ACCOUNT_ROLES = ["student", "teacher"] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export function normalizeAccountRole(value: unknown): AccountRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return (ACCOUNT_ROLES as readonly string[]).includes(normalized)
    ? (normalized as AccountRole)
    : null;
}

export function isAccountRole(value: unknown): value is AccountRole {
  return normalizeAccountRole(value) !== null;
}
