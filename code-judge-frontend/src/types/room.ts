/**
 * Room types — a Room is a teacher-created group of students that can be used
 * to control quiz registration eligibility.
 */

export interface RoomStudent {
  id: string;
  name: string;
  rollNumber: string;
  /** Public @username shown in creator-facing lists. */
  username?: string;
  /** @deprecated Use username instead — kept for backwards compatibility with persisted data. */
  email?: string;
  active: boolean;
  /** Avatar id (1-7) for the predefined local avatars. */
  avatarId: number;
  /** ISO timestamp when the student was added to this room. */
  addedAt?: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  /**
   * Admin/teacher account that owns this room. Rooms are reusable,
   * persistent resources owned by an admin — a quiz references them via
   * `QuizAudience.roomIds`. When unset (demo seed data) the room is treated
   * as owned by the currently authenticated admin.
   */
  ownerId?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  archived: boolean;
  students: RoomStudent[];
}

export type RoomFilterTab = "all" | "active" | "inactive";
