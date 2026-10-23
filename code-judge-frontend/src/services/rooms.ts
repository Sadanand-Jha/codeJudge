import apiClient from "@/lib/axios";
import type { Room, RoomRegistrationForm } from "@/types/room";
import type { CreatorPublicStats } from "@/services/quiz";

/** Room credentials returned once, immediately after create/reset. */
export interface RoomCredentials {
  id: string;
  name: string;
  room_code: string;
  /** Plaintext password — never retrievable again after this response. */
  password: string;
  /** ISO timestamp when the password stops working; null = never. */
  password_expires_at: string | null;
}

export interface JoinedRoom {
  room: {
    id: string;
    name: string;
  };
  teacher: CreatorPublicStats | null;
}

export interface RoomJoinPreview {
  room: {
    id: string;
    name: string;
  };
  ownerId: string;
  teacher: CreatorPublicStats | null;
  password_expires_at: string | null;
  registration_form: RoomRegistrationForm;
  already_member: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  description?: string | null;
  room_code: string;
  memberCount: number;
  password_expires_at: string | null;
  registration_form: RoomRegistrationForm;
  is_owner?: boolean;
  owner?: RoomOwner;
  members?: RoomMember[];
}

export interface RoomOwner {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarId: number | null;
  avatarUrl: string | null;
}

export interface RoomMember {
  id: string;
  username: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  avatarId: number | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  status: string | null;
  is_you: boolean;
}

export interface EnrolledRoom {
  id: string;
  name: string;
  description: string | null;
  room_code: string;
  is_active: boolean;
  member_count: number;
  joined_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner: RoomOwner;
}

export interface RoomPasswordExpiryInput {
  /** Minutes until the password expires; null = never, omitted = 24 hours. */
  expires_in_minutes?: number | null;
}

export async function createRoomWithPassword(
  payload: { name: string; password?: string } & RoomPasswordExpiryInput
): Promise<RoomCredentials> {
  const res = await apiClient.post<RoomCredentials>(`/rooms`, payload);
  return res.data;
}

export async function resetRoomPassword(
  roomCode: string,
  payload: RoomPasswordExpiryInput = {}
): Promise<RoomCredentials> {
  const res = await apiClient.post<RoomCredentials>(
    `/rooms/${encodeURIComponent(roomCode)}/reset-password`,
    payload
  );
  return res.data;
}

export async function previewRoomJoin(payload: {
  room_code: string;
  password: string;
}): Promise<RoomJoinPreview> {
  const res = await apiClient.post<RoomJoinPreview>(`/rooms/join/form`, payload);
  return res.data;
}

export async function joinRoom(payload: {
  room_code: string;
  password: string;
  registration_data?: Record<string, string>;
}): Promise<JoinedRoom> {
  const res = await apiClient.post<JoinedRoom>(`/rooms/join`, payload);
  return res.data;
}

export async function getRoomSummary(roomId: string): Promise<RoomSummary> {
  const res = await apiClient.get<RoomSummary>(`/rooms/${encodeURIComponent(roomId)}`);
  return res.data;
}

export async function getEnrolledRooms(): Promise<EnrolledRoom[]> {
  const res = await apiClient.get<EnrolledRoom[]>(`/rooms/enrolled`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getRoomRegistrationForm(roomId: string): Promise<RoomRegistrationForm> {
  const res = await apiClient.get<RoomRegistrationForm>(
    `/rooms/${encodeURIComponent(roomId)}/registration-form`
  );
  return res.data;
}

export async function updateRoomRegistrationForm(
  roomId: string,
  form: RoomRegistrationForm
): Promise<RoomRegistrationForm> {
  const res = await apiClient.put<RoomRegistrationForm>(
    `/rooms/${encodeURIComponent(roomId)}/registration-form`,
    form
  );
  return res.data;
}

export interface SearchedUser {
  id: string;
  username: string;
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

export async function fetchRoomsForStudent(username: string): Promise<Room[]> {
  const res = await apiClient.get(`/v1/user/rooms/by-student/${encodeURIComponent(username)}`);
  const data = (res.data as unknown as { data?: unknown })?.data ?? res.data;
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
