import apiClient from "@/lib/axios";

/* =============================================
   Profile social features service
   ---------------------------------------------
   Followers / Following / Follow actions.
   The follow system is not yet implemented on the
   backend, so these requests resolve to an empty
   list when the endpoint is unavailable. The UI
   renders honest empty states until real data
   exists. Everything is wired through the same
   axios client used across the app.
   ============================================= */

export interface ProfileUser {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  rating: number | null;
  maxRating: number | null;
  isFollowing: boolean;
  isFollower: boolean;
}

function toProfileUser(raw: unknown): ProfileUser {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    username: String(r.username ?? ""),
    firstName: r.firstName ? String(r.firstName) : null,
    lastName: r.lastName ? String(r.lastName) : null,
    displayName: r.displayName ? String(r.displayName) : null,
    avatarUrl: r.avatarUrl ? String(r.avatarUrl) : null,
    bio: r.bio ? String(r.bio) : null,
    rating: r.rating != null ? Number(r.rating) : null,
    maxRating: r.maxRating != null ? Number(r.maxRating) : null,
    isFollowing: Boolean(r.isFollowing),
    isFollower: Boolean(r.isFollower),
  };
}

/**
 * GET /v1/user/followers
 * Returns the users following the current user.
 */
export async function getFollowers(): Promise<ProfileUser[]> {
  try {
    const response = await apiClient.get<unknown[]>("/v1/user/followers");
    return (response.data ?? []).map(toProfileUser);
  } catch {
    return [];
  }
}

/**
 * GET /v1/user/following
 * Returns the users the current user follows.
 */
export async function getFollowing(): Promise<ProfileUser[]> {
  try {
    const response = await apiClient.get<unknown[]>("/v1/user/following");
    return (response.data ?? []).map(toProfileUser);
  } catch {
    return [];
  }
}

/**
 * POST /v1/user/follow/:userId
 * Follow a user by id.
 */
export async function followUser(userId: string): Promise<void> {
  await apiClient.post(`/v1/user/follow/${encodeURIComponent(userId)}`);
}

/**
 * DELETE /v1/user/follow/:userId
 * Unfollow a user by id.
 */
export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/v1/user/follow/${encodeURIComponent(userId)}`);
}

/* =============================================
   Profile activity feed
   ---------------------------------------------
   Built from real backend events (contest
   registrations, collaborator requests) so the
   timeline only ever shows genuine activity.
   ============================================= */

export interface ActivityEvent {
  id: string;
  type:
    | "contest"
    | "collaboration"
    | "achievement"
    | "profile"
    | "quiz"
    | "problem";
  title: string;
  description?: string;
  timestamp: string;
  href?: string;
  iconTone?: "pink" | "violet" | "blue" | "green" | "orange" | "amber";
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "recently";
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return "recently";
  const diff = Math.max(0, Date.now() - t);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return new Date(date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", year: "numeric" });
}

export function groupLabel(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", year: "numeric" });
}
