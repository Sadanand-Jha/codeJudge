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

export interface RoomAccessRecord {
  id: string | number;
  name: string;
  room_code: string;
  password_hash: string;
  is_active: boolean | null;
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
}

export interface RoomJoinInput {
  roomCode: string;
  password: string;
  userId: string;
  registrationData?: unknown;
}

export interface RoomJoinPreview {
  room: {
    id: string;
    name: string;
  };
  registration_form: RoomRegistrationForm;
}

export type RoomJoinResult =
  | {
      ok: true;
      room: {
        id: string;
        name: string;
      };
    }
  | {
      ok: false;
      reason: "invalid_credentials";
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
): Promise<RoomAccessRecord | null> {
  const roomCode = normalizeRoomCode(roomCodeInput);
  const room = isValidRoomCodeInput(roomCode)
    ? await repo.findRoomByCode(roomCode)
    : null;

  const hash = room?.password_hash ?? (await getDummyHash());
  const passwordMatches = await verifyRoomPassword(String(password ?? ""), hash);

  if (!room || !passwordMatches || isClosed(room)) return null;
  return room;
}

/**
 * Verify a room code + password and return the fields the student must fill
 * before joining. Does not create a membership.
 */
export async function previewRoomJoinWithPassword(
  repo: RoomLookupRepository,
  input: { roomCode: string; password: string }
): Promise<RoomJoinPreview | null> {
  const room = await findJoinableRoom(repo, input.roomCode, input.password);
  if (!room) return null;

  return {
    room: { id: String(room.id), name: room.name },
    registration_form: normalizeRoomRegistrationForm(room.registration_form),
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
  const room = await findJoinableRoom(repo, input.roomCode, input.password);
  if (!room) return { ok: false, reason: "invalid_credentials" };

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
