import apiClient from "@/lib/axios";
import type { Room } from "@/types/room";

export interface SearchedUser {
  id: string;
  username: string;
  email?: string;
  avatarId?: number;
  avatarUrl?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export async function searchUserByUsername(username: string): Promise<SearchedUser> {
  const res = await apiClient.get<{ success: boolean; data: SearchedUser }>(`/v1/user/rooms/search/user`, {
    params: { username },
  });
  // Some deployments return {success,data} while interceptor unwraps — handle both
  const data = (res.data as unknown as { data?: SearchedUser })?.data ?? (res.data as unknown as SearchedUser);
  if (!data || !(data as SearchedUser).username) throw new Error("User not found");
  return data as SearchedUser;
}

export async function searchUsers(query: string): Promise<SearchedUser[]> {
  const res = await apiClient.get<{ success: boolean; data: SearchedUser[] }>(`/v1/user/rooms/search/users`, {
    params: { q: query },
  });
  const data = (res.data as unknown as { data?: SearchedUser[] })?.data ?? (res.data as unknown as SearchedUser[]);
  return Array.isArray(data) ? (data as SearchedUser[]) : [];
}

export async function addMemberToRoom(roomId: string, username: string) {
  const res = await apiClient.post(`/v1/user/rooms/${roomId}/members`, { username });
  return res.data;
}

export async function createRoom(payload: { name: string; description?: string }) {
  const res = await apiClient.post(`/v1/user/rooms`, payload);
  return res.data;
}

export async function listRooms() {
  const res = await apiClient.get(`/v1/user/rooms`);
  return res.data;
}

export async function getRoom(roomId: string) {
  const res = await apiClient.get(`/v1/user/rooms/${roomId}`);
  return res.data;
}

export async function updateMemberStatus(roomId: string, identifier: string, active: boolean) {
  const res = await apiClient.patch(`/v1/user/rooms/${roomId}/members/${encodeURIComponent(identifier)}`, { active });
  return res.data;
}

export async function updateRoomPatch(roomId: string, patch: { name?: string; description?: string; archived?: boolean }) {
  const res = await apiClient.patch(`/v1/user/rooms/${roomId}`, patch);
  return res.data;
}

export async function removeMember(roomId: string, identifier: string) {
  const res = await apiClient.delete(`/v1/user/rooms/${roomId}/members/${encodeURIComponent(identifier)}`);
  return res.data;
}

export async function fetchMyRooms(): Promise<Room[]> {
  // Frontend expects GET /my-rooms on going to rooms page — support both aliases
  let data: unknown;
  try {
    const res = await apiClient.get(`/v1/user/my-rooms`);
    data = (res.data as unknown as { data?: unknown })?.data ?? res.data;
  } catch {
    const res = await apiClient.get(`/v1/user/rooms/my-rooms`);
    data = (res.data as unknown as { data?: unknown })?.data ?? res.data;
  }
  const rows = Array.isArray(data) ? data as Record<string, unknown>[] : [];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    description: (row.description as string) ?? undefined,
    ownerId: row.owner_id != null ? String(row.owner_id) : undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    archived: (row.is_active as boolean) === false,
    students: [],
    memberCount: typeof row.member_count === "number" ? row.member_count : Number(row.member_count ?? 0),
  }));
}

// Legacy fallback: direct user lookup via /v1/user/users/:username (now returns avatar too)
export async function lookupUserDirect(username: string): Promise<SearchedUser> {
  const res = await apiClient.get<{ success: boolean; data: SearchedUser }>(`/v1/user/users/${encodeURIComponent(username)}`);
  const data = (res.data as unknown as { data?: SearchedUser })?.data ?? (res.data as unknown as SearchedUser);
  return data as SearchedUser;
}
