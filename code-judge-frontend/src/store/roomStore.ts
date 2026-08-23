"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Room, RoomStudent } from "@/types/room";
import { AudienceStudent } from "@/components/quiz/creator/types";
// Dummy rooms commented out — now using backend implementation for rooms (see src/services/rooms.ts)
// import { MOCK_ROOMS } from "@/mocks/rooms";
// Using empty initial state; rooms are fetched/created via backend (quiz_rooms / room_members)
const MOCK_ROOMS: Room[] = [];

interface CreateRoomInput {
  name: string;
  description?: string;
  students?: RoomStudent[];
  /** Admin/teacher account that owns this room. */
  ownerId?: string | number;
}

interface RoomStoreState {
  /** All rooms for the current teacher (active + archived). */
  rooms: Room[];
  hydrated: boolean;
  /** Most-recently-used room ids, newest first — drives the "Recently Used" filter. */
  recentlyUsedIds: string[];
  /** Most-recently-used student roll numbers — drives the "Recently Used" student filter. */
  recentlyUsedStudentIds: string[];

  hydrate: () => void;
  setRooms: (rooms: Room[]) => void;
  createRoom: (input: CreateRoomInput) => Room;
  updateRoom: (id: string, patch: { name?: string; description?: string }) => void;
  archiveRoom: (id: string) => void;
  unarchiveRoom: (id: string) => void;
  duplicateRoom: (id: string, options?: { copyStudents?: boolean }) => Room | null;
  deleteRoom: (id: string) => void;
  addStudents: (roomId: string, students: RoomStudent[]) => void;
  removeStudents: (roomId: string, studentIds: string[]) => void;
  setStudentActive: (roomId: string, studentId: string, active: boolean) => void;
  updateStudent: (roomId: string, studentId: string, patch: Partial<Pick<RoomStudent, "name" | "rollNumber" | "username" | "active">>) => void;
  markRecentlyUsed: (roomId: string) => void;
  markRecentlyUsedStudent: (rollNumber: string) => void;
}

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function findRoom(state: RoomStoreState, roomId: string): Room | undefined {
  return state.rooms.find((r) => r.id === roomId);
}

function bumpUpdatedAt(room: Room): Room {
  return { ...room, updatedAt: new Date().toISOString() };
}

/**
 * Room store backed by the room service (currently mock/localStorage, later a
 * real API). Persisted to localStorage so rooms survive reloads.
 */
function migrateStudentUsernames(rooms: Room[]): Room[] {
  return rooms.map((room) => ({
    ...room,
    students: room.students.map((s) => {
      if (s.username) return s;
      const fallback = (s as unknown as { email?: string }).email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, "") || `user_${s.rollNumber.toLowerCase()}`;
      return { ...s, username: fallback };
    }),
  }));
}

export const useRoomStore = create<RoomStoreState>()(
  persist(
    (set, get) => ({
      rooms: MOCK_ROOMS,
      hydrated: false,
      recentlyUsedIds: [],
      recentlyUsedStudentIds: [],

      hydrate: () =>
        set((state) => ({
          hydrated: true,
          // Remove dummy mock rooms (ids like room_cse_a) — now using backend
          rooms: migrateStudentUsernames(state.rooms.filter((r) => !String(r.id).startsWith("room_"))),
        })),

      setRooms: (rooms) => set({ rooms: migrateStudentUsernames(rooms) }),

      createRoom: ({ name, description, students, ownerId }) => {
        const now = new Date().toISOString();
        const room: Room = {
          id: uid("room"),
          name: name.trim(),
          description: description?.trim() || undefined,
          ownerId: ownerId != null ? String(ownerId) : undefined,
          createdAt: now,
          updatedAt: now,
          archived: false,
          students: students ?? [],
        };
        set({ rooms: [...get().rooms, room] });
        return room;
      },

      updateRoom: (id, patch) => {
        set({
          rooms: get().rooms.map((r) =>
            r.id === id
              ? bumpUpdatedAt({
                  ...r,
                  name: patch.name !== undefined ? patch.name.trim() : r.name,
                  description:
                    patch.description !== undefined
                      ? patch.description.trim() || undefined
                      : r.description,
                })
              : r
          ),
        });
      },

      archiveRoom: (id) => {
        set({
          rooms: get().rooms.map((r) => (r.id === id ? bumpUpdatedAt({ ...r, archived: true }) : r)),
        });
      },

      unarchiveRoom: (id) => {
        set({
          rooms: get().rooms.map((r) => (r.id === id ? bumpUpdatedAt({ ...r, archived: false }) : r)),
        });
      },

      duplicateRoom: (id, options = {}) => {
        const source = findRoom(get(), id);
        if (!source) return null;
        const now = new Date().toISOString();
        const copyStudents = options.copyStudents !== false;
        const copy: Room = {
          ...source,
          id: uid("room"),
          name: `${source.name} (copy)`,
          description: source.description,
          ownerId: source.ownerId,
          createdAt: now,
          updatedAt: now,
          archived: false,
          students: copyStudents
            ? source.students.map((s) => ({
                ...s,
                id: uid("stu"),
                addedAt: now,
              }))
            : [],
        };
        set({ rooms: [...get().rooms, copy] });
        return copy;
      },

      deleteRoom: (id) => {
        set({ rooms: get().rooms.filter((r) => r.id !== id) });
      },

      addStudents: (roomId, students) => {
        if (!students || students.length === 0) return;
        const now = new Date().toISOString();
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== roomId) return r;
            const existingKeys = new Set(r.students.map((s) => s.rollNumber.toLowerCase()));
            const fresh = students
              .map((s) => ({ ...s, id: s.id || uid("stu"), addedAt: s.addedAt || now }))
              .filter((s) => !existingKeys.has(s.rollNumber.toLowerCase()));
            return bumpUpdatedAt({ ...r, students: [...r.students, ...fresh] });
          }),
        });
      },

      removeStudents: (roomId, studentIds) => {
        set({
          rooms: get().rooms.map((r) =>
            r.id === roomId
              ? bumpUpdatedAt({ ...r, students: r.students.filter((s) => !studentIds.includes(s.id)) })
              : r
          ),
        });
      },

      setStudentActive: (roomId, studentId, active) => {
        set({
          rooms: get().rooms.map((r) =>
            r.id === roomId
              ? bumpUpdatedAt({
                  ...r,
                  students: r.students.map((s) => (s.id === studentId ? { ...s, active } : s)),
                })
              : r
          ),
        });
      },

      updateStudent: (roomId, studentId, patch) => {
        set({
          rooms: get().rooms.map((r) =>
            r.id === roomId
              ? bumpUpdatedAt({
                  ...r,
                  students: r.students.map((s) =>
                    s.id === studentId
                      ? {
                          ...s,
                          name: patch.name !== undefined ? patch.name.trim() : s.name,
                          rollNumber: patch.rollNumber !== undefined ? patch.rollNumber.trim() : s.rollNumber,
                          username: patch.username !== undefined ? patch.username.trim().toLowerCase() : s.username,
                          // keep legacy email in sync if present
                          email: (patch as Record<string, unknown>).email !== undefined ? String((patch as Record<string, unknown>).email).trim().toLowerCase() : s.email,
                          active: patch.active ?? s.active,
                        }
                      : s
                  ),
                })
              : r
          ),
        });
      },

      markRecentlyUsed: (roomId) => {
        const rest = get().recentlyUsedIds.filter((id) => id !== roomId);
        set({ recentlyUsedIds: [roomId, ...rest].slice(0, 10) });
      },

      markRecentlyUsedStudent: (rollNumber) => {
        const key = rollNumber.toLowerCase();
        const rest = get().recentlyUsedStudentIds.filter((id) => id !== key);
        set({ recentlyUsedStudentIds: [key, ...rest].slice(0, 20) });
      },
    }),
    {
      name: "byteclash_rooms",
      partialize: (state) => ({
        rooms: state.rooms,
        recentlyUsedIds: state.recentlyUsedIds,
        recentlyUsedStudentIds: state.recentlyUsedStudentIds,
      }),
    }
  )
);

/* =============================================
   Eligibility helpers (display-only)
   ============================================= */

/** Rooms owned by `userId` (rooms without an owner belong to the current admin). */
export function getOwnedRooms(rooms: Room[], userId?: string | number | null): Room[] {
  if (!userId) return rooms;
  return rooms.filter((r) => !r.ownerId || r.ownerId === String(userId));
}

/**
 * Global student directory across the teacher's active rooms, deduped by roll
 * number. This powers the "All Students" filter in individual student
 * selection.
 */
export function getAllStudents(rooms: Room[]): RoomStudent[] {
  const seen = new Map<string, RoomStudent>();
  for (const room of rooms) {
    if (room.archived) continue;
    for (const student of room.students) {
      const key = student.rollNumber.toLowerCase();
      if (!seen.has(key)) seen.set(key, student);
    }
  }
  return Array.from(seen.values());
}

/**
 * The rooms a student belongs to (matched by roll number). A student can
 * belong to multiple rooms — rooms are just memberships around a central
 * student identity, never a copy of the student record.
 */
export function getStudentRooms(rooms: Room[], rollNumber: string): Room[] {
  const key = rollNumber.toLowerCase();
  return rooms.filter((room) => room.students.some((s) => s.rollNumber.toLowerCase() === key));
}

/**
 * Count how many quizzes reference a room by scanning the per-quiz audience
 * copies in localStorage. Display-only — used for the "Quizzes Used" stat.
 */
export function countRoomQuizUsage(roomId: string): number {
  if (typeof window === "undefined") return 0;
  let count = 0;
  try {
    const prefix = "byteclash_quiz_audience_";
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { roomIds?: string[] };
      if (parsed.roomIds?.includes(roomId)) count++;
    }
  } catch {
    // ignore malformed entries
  }
  return count;
}

/**
 * Union of students from the selected rooms AND the individually selected
 * students, deduped by roll number (OR logic — each student appears once).
 * Returns a Map keyed by roll number → student.
 */
export function getEligibleStudentMap(
  rooms: Room[],
  roomIds: string[],
  individuals: AudienceStudent[] = []
): Map<string, RoomStudent | AudienceStudent> {
  const selected = new Set(roomIds);
  const eligible = new Map<string, RoomStudent | AudienceStudent>();
  for (const room of rooms) {
    if (!selected.has(room.id)) continue;
    for (const student of room.students) {
      if (!student.active) continue;
      const key = student.rollNumber.toLowerCase();
      if (!eligible.has(key)) eligible.set(key, student);
    }
  }
  for (const student of individuals) {
    const key = student.rollNumber.toLowerCase();
    if (!eligible.has(key)) eligible.set(key, student);
  }
  return eligible;
}

/** Union of students across the selected rooms only (backward-compatible). */
export function getEligibleStudents(rooms: Room[], roomIds: string[]): Map<string, RoomStudent> {
  return getEligibleStudentMap(rooms, roomIds) as Map<string, RoomStudent>;
}

export function getEligibleCount(rooms: Room[], roomIds: string[]): number {
  return getEligibleStudents(rooms, roomIds).size;
}

/**
 * Audience breakdown used by the Audience page summary:
 *   roomCount       — number of selected rooms
 *   studentCount    — number of individually selected students
 *   roomSum         — total students across selected rooms (may double-count)
 *   roomUnique      — unique students across selected rooms
 *   roomOverlap     — roomSum - roomUnique (students in more than one room)
 *   individualOverlap — individuals who are already in a selected room
 *   unique          — total unique eligible students (rooms ∪ individuals)
 */
export function countAudience(
  rooms: Room[],
  roomIds: string[],
  individuals: AudienceStudent[] = []
): {
  roomCount: number;
  studentCount: number;
  roomSum: number;
  roomUnique: number;
  roomOverlap: number;
  individualOverlap: number;
  unique: number;
} {
  const selected = new Set(roomIds);
  let roomSum = 0;
  const roomUniqueSet = new Map<string, RoomStudent>();
  for (const room of rooms) {
    if (!selected.has(room.id)) continue;
    for (const student of room.students) {
      if (!student.active) continue;
      roomSum++;
      const key = student.rollNumber.toLowerCase();
      if (!roomUniqueSet.has(key)) roomUniqueSet.set(key, student);
    }
  }
  const roomUnique = roomUniqueSet.size;
  let individualOverlap = 0;
  for (const student of individuals) {
    if (roomUniqueSet.has(student.rollNumber.toLowerCase())) individualOverlap++;
  }
  const unique = getEligibleStudentMap(rooms, roomIds, individuals).size;
  return {
    roomCount: roomIds.length,
    studentCount: individuals.length,
    roomSum,
    roomUnique,
    roomOverlap: roomSum - roomUnique,
    individualOverlap,
    unique,
  };
}

/**
 * Resolve whether a logged-in user is eligible for a quiz: belongs to any of
 * the selected rooms OR matches an individually selected student. Matches on
 * username, roll number, then full name (falls back to legacy email for persisted data).
 */
export function isUserEligible(
  rooms: Room[],
  roomIds: string[],
  user?: { email?: string | null; username?: string | null; rollNo?: string | null; name?: string | null } | null,
  individuals: AudienceStudent[] = []
): boolean {
  if (!user?.email && !user?.username && !user?.rollNo && !user?.name) return false;
  const selected = new Set(roomIds);
  const email = user.email?.toLowerCase();
  const username = user.username?.toLowerCase();
  const roll = user.rollNo?.toLowerCase();
  const name = user.name?.toLowerCase();

  const matches = (s: { username?: string; email?: string; rollNumber: string; name: string }) => {
    const sUsername = (s.username ?? s.email?.split("@")[0] ?? "").toLowerCase();
    if (username && sUsername === username) return true;
    if (email && s.email?.toLowerCase() === email) return true;
    if (roll && s.rollNumber.toLowerCase() === roll) return true;
    if (name && s.name.toLowerCase() === name) return true;
    return false;
  };

  for (const room of rooms) {
    if (!selected.has(room.id)) continue;
    for (const student of room.students) {
      if (!student.active) continue;
      if (matches(student)) return true;
    }
  }
  for (const student of individuals) {
    if (matches(student)) return true;
  }
  return false;
}

/** Compact one-line summary: Everyone / 1 Room / 3 Rooms / 24 Students / 3 Rooms + 5 Students. */
export function getAudienceSummaryLabel(audience?: {
  mode: "EVERYONE" | "ROOMS" | "STUDENTS" | "ROOMS_STUDENTS";
  roomIds: string[];
  students?: Array<{ rollNumber: string }>;
}): string {
  if (!audience) return "Everyone";
  const rooms = audience.roomIds?.length ?? 0;
  const students = audience.students?.length ?? 0;
  switch (audience.mode) {
    case "EVERYONE":
      return "Everyone";
    case "ROOMS":
      return rooms === 1 ? "1 Room" : `${rooms} Rooms`;
    case "STUDENTS":
      return students === 1 ? "1 Student" : `${students} Students`;
    case "ROOMS_STUDENTS":
      if (rooms === 0) return students === 1 ? "1 Student" : `${students} Students`;
      if (students === 0) return rooms === 1 ? "1 Room" : `${rooms} Rooms`;
      return `${rooms} Room${rooms !== 1 ? "s" : ""} + ${students} Student${students !== 1 ? "s" : ""}`;
    default:
      return "Everyone";
  }
}

/** Format the sidebar/status label for an audience config. */
export function getAudienceStatusLabel(audience?: {
  mode: "EVERYONE" | "ROOMS" | "STUDENTS" | "ROOMS_STUDENTS";
  roomIds: string[];
  students?: Array<{ rollNumber: string }>;
}): string {
  if (!audience) return "Everyone";
  if (audience.mode === "EVERYONE") return "Everyone";
  const label = getAudienceSummaryLabel(audience);
  return label === "Everyone" ? "Restricted" : label;
}
