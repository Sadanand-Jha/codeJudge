/**
 * Room types — a Room is a teacher-created group of students that can be used
 * to control quiz registration eligibility.
 */

export type RoomRegistrationFieldType = "text" | "email" | "phone" | "number" | "select";

/** One creator-defined field on the student registration form. */
export interface RoomRegistrationField {
  id: string;
  /** Label shown to students. Also used as the answer key. */
  label: string;
  type: RoomRegistrationFieldType;
  required: boolean;
  /** Only for type="select". */
  options: string[];
}

/** Creator-defined registration form students fill before joining. */
export interface RoomRegistrationForm {
  title: string;
  description: string;
  fields: RoomRegistrationField[];
}

export const EMPTY_ROOM_REGISTRATION_FORM: RoomRegistrationForm = {
  title: "Student registration",
  description: "",
  fields: [],
};

export interface RoomStudent {
  id: string;
  name: string;
  rollNumber: string;
  /** Public @username shown in creator-facing lists. */
  username?: string;
  active: boolean;
  /** Avatar id (1-6) for the predefined local avatars. */
  avatarId: number;
  /** Avatar URL from DB — if present, use this instead of dicebear fallback. */
  avatarUrl?: string | null;
  /** ISO timestamp when the student was added to this room. */
  addedAt?: string;
  /**
   * Teacher-defined fields imported with the student (column name → value),
   * mirroring how quiz registration fields store values per student.
   */
  data?: Record<string, string>;
  /** Answers submitted on the room's custom registration form (label → value). */
  registrationData?: Record<string, string>;
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
  /** Member count from backend (when rooms are fetched via /my-rooms). */
  memberCount?: number;
  /** Creator-defined form students fill before joining (when loaded). */
  registrationForm?: RoomRegistrationForm;
  /** ISO timestamp when the shared password stops working; null = never. */
  passwordExpiresAt?: string | null;
}

export type RoomFilterTab = "all" | "active" | "inactive";
