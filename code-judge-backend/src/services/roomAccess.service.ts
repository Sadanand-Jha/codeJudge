// Room access business logic: password hashing/verification, unique code
// allocation, and the idempotent join flow. Kept free of Express/DB imports so
// the invariants (constant-time verification, generic failures, duplicate
// joins) are unit-testable.
import bcrypt from "bcryptjs";
import {
  generateRoomCode,
  isValidRoomCodeInput,
  normalizeRoomCode,
} from "../utils/roomCode.ts";
import {
  normalizeRoomRegistrationForm,
  validateRoomRegistrationData,
  type RoomRegistrationForm,
} from "./roomRegistration.service.ts";

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

/** The only message a failed join ever learns from the server. */
export const ROOM_JOIN_ERROR = "Wrong room code or password";
export const ROOM_PASSWORD_EXPIRED_ERROR =
  "This room password has expired. Ask your teacher for a new one.";

/** New rooms get a 24-hour password unless the creator chooses otherwise. */
export const DEFAULT_PASSWORD_VALIDITY_MINUTES = 24 * 60;

export interface RoomAccessRecord {
  id: string | number;
  owner_id?: string | number | null;
  name: string;
  room_code: string;
  password_hash: string;
  is_active: boolean | null;
  /** When the shared password stops working. NULL = never. */
  password_expires_at?: string | Date | null;
  /** Creator-defined registration form (raw JSONB from Postgres). */
  registration_form?: unknown;
  /** Optional future-facing close state; archived rooms set is_active=false. */
  status?: string | null;
}

export interface RoomAccessRepository {
  findRoomByCode(code: string): Promise<RoomAccessRecord | null>;
  addMember(
    roomId: string | number,
    userId: string,
    role: string,
    registrationData: Record<string, string> | null
  ): Promise<{ inserted: boolean }>;
  /** Optional so credential-only previews do not need a membership lookup. */
  isMember?(roomId: string | number, userId: string): Promise<boolean>;
}

export interface RoomJoinInput {
  roomCode: string;
  password: string;
  userId: string;
  registrationData?: unknown;
}

export interface RoomPreviewInput {
  roomCode: string;
  password: string;
  userId?: string;
}

export interface RoomJoinPreview {
  room: {
    id: string;
    name: string;
  };
  /** Teacher account that owns the room, used to load the public teacher card. */
  ownerId: string;
  /** ISO timestamp for the password, or null when it never expires. */
  password_expires_at: string | null;
  registration_form: RoomRegistrationForm;
  /** True when the signed-in student already has a membership in this room. */
  already_member: boolean;
}

export type RoomAccessFailure = "invalid_credentials" | "password_expired";

export type RoomPreviewResult =
  | { ok: true; preview: RoomJoinPreview }
  | { ok: false; reason: RoomAccessFailure };

export type RoomJoinResult =
  | {
      ok: true;
      room: {
        id: string;
        name: string;
      };
      ownerId: string;
    }
  | {
      ok: false;
      reason: RoomAccessFailure;
    }
  | {
      ok: false;
      reason: "registration_invalid";
      form: RoomRegistrationForm;
      fieldErrors: Record<string, string>;
    };

export function hashRoomPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/** bcrypt.compare is constant-time with respect to the hash contents. */
export function verifyRoomPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Convert the creator's validity window into an absolute timestamp.
 * `null` explicitly means "never expires"; omitting the value applies the
 * 24-hour default. The room code is unaffected by this timestamp.
 */
export function computePasswordExpiresAt(
  expiresInMinutes: number | null | undefined,
  now: Date = new Date()
): Date | null {
  if (expiresInMinutes === null) return null;
  const minutes =
    typeof expiresInMinutes === "number" && Number.isFinite(expiresInMinutes)
      ? Math.max(1, Math.trunc(expiresInMinutes))
      : DEFAULT_PASSWORD_VALIDITY_MINUTES;
  return new Date(now.getTime() + minutes * 60_000);
}

export function isRoomPasswordExpired(
  room: Pick<RoomAccessRecord, "password_expires_at">,
  now: Date = new Date()
): boolean {
  if (!room.password_expires_at) return false;
  const expiresAt = new Date(room.password_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() <= now.getTime();
}

export function roomPasswordExpiresAtIso(
  room: Pick<RoomAccessRecord, "password_expires_at">
): string | null {
  if (!room.password_expires_at) return null;
  const expiresAt = new Date(room.password_expires_at);
  return Number.isNaN(expiresAt.getTime()) ? null : expiresAt.toISOString();
}

// Used when no room matches so a missing code costs the same bcrypt work as a
// wrong password. Lazily computed once per process.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash("not-a-real-room-password", BCRYPT_SALT_ROUNDS);
  }
  return dummyHashPromise;
}

function isClosed(room: RoomAccessRecord): boolean {
  if (room.is_active === false) return true;
  const status = String(room.status ?? "").toLowerCase();
  return status === "closed" || status === "archived";
}

/**
 * Shared credential check. Every failure (unknown code, malformed code, wrong
 * password, archived/closed room) returns null, and a missing code still pays
 * the bcrypt cost so codes cannot be probed by timing.
 */
type RoomLookupRepository = Pick<RoomAccessRepository, "findRoomByCode">;

async function findJoinableRoom(
  repo: RoomLookupRepository,
  roomCodeInput: string,
  password: string
): Promise<{ ok: true; room: RoomAccessRecord } | { ok: false; reason: RoomAccessFailure }> {
  const roomCode = normalizeRoomCode(roomCodeInput);
  const room = isValidRoomCodeInput(roomCode)
    ? await repo.findRoomByCode(roomCode)
    : null;

  const hash = room?.password_hash ?? (await getDummyHash());
  const passwordMatches = await verifyRoomPassword(String(password ?? ""), hash);

  if (!room || !passwordMatches || isClosed(room)) {
    return { ok: false, reason: "invalid_credentials" };
  }

  // The password was correct, so reporting expiry does not reveal whether a
  // code exists to someone guessing credentials.
  if (isRoomPasswordExpired(room)) {
    return { ok: false, reason: "password_expired" };
  }

  return { ok: true, room };
}

/**
 * Verify a room code + password and return the fields the student must fill
 * before joining. Does not create a membership.
 */
export async function previewRoomJoinWithPassword(
  repo: RoomLookupRepository & Pick<RoomAccessRepository, "isMember">,
  input: RoomPreviewInput
): Promise<RoomPreviewResult> {
  const access = await findJoinableRoom(repo, input.roomCode, input.password);
  if (!access.ok) return access;

  const already_member =
    input.userId && repo.isMember
      ? await repo.isMember(access.room.id, input.userId)
      : false;

  return {
    ok: true,
    preview: {
      room: { id: String(access.room.id), name: access.room.name },
      ownerId: String(access.room.owner_id ?? ""),
      password_expires_at: roomPasswordExpiresAtIso(access.room),
      registration_form: normalizeRoomRegistrationForm(access.room.registration_form),
      already_member,
    },
  };
}

/**
 * Join a room by code and password. Credential failures return
 * `invalid_credentials` (the controller emits one generic 401). A registration
 * form failure returns field errors so the student can fix their answers
 * without losing the credentials. Duplicate joins stay idempotent.
 */
export async function joinRoomWithPassword(
  repo: RoomAccessRepository,
  input: RoomJoinInput
): Promise<RoomJoinResult> {
  const access = await findJoinableRoom(repo, input.roomCode, input.password);
  if (!access.ok) return access;
  const room = access.room;

  const form = normalizeRoomRegistrationForm(room.registration_form);
  const registration = validateRoomRegistrationData(form, input.registrationData);
  if (!registration.ok) {
    return {
      ok: false,
      reason: "registration_invalid",
      form,
      fieldErrors: registration.fieldErrors,
    };
  }

  const registrationData =
    Object.keys(registration.values).length > 0 ? registration.values : null;
  await repo.addMember(room.id, input.userId, "student", registrationData);

  return {
    ok: true,
    room: {
      id: String(room.id),
      name: room.name,
    },
    ownerId: String(room.owner_id ?? ""),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23505";
}

export interface UniqueRoomInsertDependencies<TRow> {
  codeExists: (code: string) => Promise<boolean>;
  insertRoom: (code: string) => Promise<TRow>;
  generateCode?: () => string;
}

/**
 * Generate a code and insert, retrying on both a pre-check collision and a
 * unique-violation race (two teachers creating a room simultaneously).
 */
export async function insertRoomWithUniqueCode<TRow>(
  deps: UniqueRoomInsertDependencies<TRow>,
  maxAttempts = 10
): Promise<{ room: TRow; code: string }> {
  const generateCode = deps.generateCode ?? (() => generateRoomCode());

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateCode();
    if (await deps.codeExists(code)) continue;
    try {
      const room = await deps.insertRoom(code);
      return { room, code };
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  throw new Error("ROOM_CODE_GENERATION_FAILED");
}
