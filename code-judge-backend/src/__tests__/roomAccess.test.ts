/**
 * Unit tests for room code/password generation and the join flow.
 *
 * Run: npm run test:rooms
 * (pure TS + bcryptjs; no database required)
 */
import { strict as assert } from "node:assert";
import {
  ROOM_CODE_ALPHABET,
  generateRoomCode,
  generateRoomPassword,
  isValidRoomCodeInput,
  normalizeRoomCode,
} from "../utils/roomCode.ts";
import {
  computePasswordExpiresAt,
  hashRoomPassword,
  insertRoomWithUniqueCode,
  isRoomPasswordExpired,
  joinRoomWithPassword,
  previewRoomJoinWithPassword,
  verifyRoomPassword,
  type RoomAccessRecord,
  type RoomAccessRepository,
} from "../services/roomAccess.service.ts";
import {
  normalizeRoomRegistrationForm,
  validateRoomRegistrationData,
} from "../services/roomRegistration.service.ts";

let passed = 0;
const test = async (name: string, fn: () => Promise<void> | void) => {
  await fn();
  passed++;
  console.log(`✓ ${name}`);
};

const ALPHABET_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{6}$`);

function fakeRepository(room: RoomAccessRecord | null) {
  const joined: Array<{
    roomId: string | number;
    userId: string;
    role: string;
    registrationData: Record<string, string> | null;
  }> = [];
  const lookups: string[] = [];
  const repo: RoomAccessRepository = {
    findRoomByCode: async (code) => {
      lookups.push(code);
      return room;
    },
    addMember: async (roomId, userId, role, registrationData) => {
      joined.push({ roomId, userId, role, registrationData });
      return { inserted: true };
    },
  };
  return { repo, joined, lookups };
}

async function main() {
  // ────────────────────────────────────────────────────────────────────────
  // Code + password generation
  // ────────────────────────────────────────────────────────────────────────
  await test("generated room codes are 6 chars from the unambiguous alphabet", () => {
    for (let i = 0; i < 2000; i++) {
      const code = generateRoomCode();
      assert.equal(code.length, 6);
      assert.match(code, ALPHABET_PATTERN, `unexpected code: ${code}`);
      assert.doesNotMatch(code, /[0O1IL]/);
    }
  });

  await test("generated room codes are effectively unique", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateRoomCode()));
    assert.ok(codes.size > 1990, `expected unique codes, got ${codes.size}/2000`);
  });

  await test("generated passwords are 8 lowercase alphanumeric chars", () => {
    for (let i = 0; i < 500; i++) {
      assert.match(generateRoomPassword(), /^[a-z0-9]{8}$/);
    }
  });

  await test("room codes normalize to trimmed uppercase", () => {
    assert.equal(normalizeRoomCode("  ab12cd "), "AB12CD");
    assert.equal(isValidRoomCodeInput("AB12CD"), true);
    assert.equal(isValidRoomCodeInput("AB12C"), false);
    assert.equal(isValidRoomCodeInput("AB-12CD"), false);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Password hashing / verification
  // ────────────────────────────────────────────────────────────────────────
  await test("password hash verifies the correct password", async () => {
    const hash = await hashRoomPassword("maple7x");
    assert.notEqual(hash, "maple7x");
    assert.match(hash, /^\$2[aby]\$/);
    assert.equal(await verifyRoomPassword("maple7x", hash), true);
  });

  await test("password hash rejects a wrong password", async () => {
    const hash = await hashRoomPassword("maple7x");
    assert.equal(await verifyRoomPassword("maple7y", hash), false);
    assert.equal(await verifyRoomPassword("", hash), false);
  });

  await test("password expiry defaults to 24 hours and supports never", () => {
    const now = new Date("2026-10-23T12:00:00.000Z");
    assert.equal(
      computePasswordExpiresAt(undefined, now)?.toISOString(),
      "2026-10-24T12:00:00.000Z"
    );
    assert.equal(
      computePasswordExpiresAt(30, now)?.toISOString(),
      "2026-10-23T12:30:00.000Z"
    );
    assert.equal(computePasswordExpiresAt(null, now), null);
    assert.equal(isRoomPasswordExpired({ password_expires_at: null }, now), false);
    assert.equal(
      isRoomPasswordExpired({ password_expires_at: "2026-10-23T11:59:00.000Z" }, now),
      true
    );
    assert.equal(
      isRoomPasswordExpired({ password_expires_at: "2026-10-23T12:01:00.000Z" }, now),
      false
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // Join flow
  // ────────────────────────────────────────────────────────────────────────
  const password = "maple7x";
  const passwordHash = await hashRoomPassword(password);
  const activeRoom: RoomAccessRecord = {
    id: 42,
    name: "Class 10 Maths",
    room_code: "AB23CD",
    password_hash: passwordHash,
    is_active: true,
  };

  await test("join succeeds and inserts an idempotent student membership", async () => {
    const { repo, joined, lookups } = fakeRepository(activeRoom);
    const result = await joinRoomWithPassword(repo, {
      roomCode: " ab23cd ",
      password,
      userId: "7",
    });
    assert.deepEqual(result, {
      ok: true,
      room: { id: "42", name: "Class 10 Maths" },
      ownerId: "",
    });
    assert.deepEqual(lookups, ["AB23CD"]);
    assert.deepEqual(joined, [
      { roomId: 42, userId: "7", role: "student", registrationData: null },
    ]);
  });

  await test("join failure: wrong password uses a generic outcome and adds no member", async () => {
    const { repo, joined } = fakeRepository(activeRoom);
    const result = await joinRoomWithPassword(repo, {
      roomCode: "AB23CD",
      password: "wrongpass",
      userId: "7",
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_credentials" });
    assert.equal(joined.length, 0);
  });

  await test("join failure: unknown code uses a generic outcome", async () => {
    const { repo, joined } = fakeRepository(null);
    const result = await joinRoomWithPassword(repo, {
      roomCode: "ZZ99ZZ",
      password,
      userId: "7",
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_credentials" });
    assert.equal(joined.length, 0);
  });

  await test("join failure: malformed code never touches the repository", async () => {
    const { repo, lookups } = fakeRepository(activeRoom);
    const result = await joinRoomWithPassword(repo, {
      roomCode: "nope",
      password,
      userId: "7",
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_credentials" });
    assert.equal(lookups.length, 0);
  });

  await test("join failure: archived room uses a generic outcome", async () => {
    const { repo, joined } = fakeRepository({ ...activeRoom, is_active: false });
    const result = await joinRoomWithPassword(repo, {
      roomCode: "AB23CD",
      password,
      userId: "7",
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_credentials" });
    assert.equal(joined.length, 0);
  });

  await test("expired password rejects preview and join without adding a member", async () => {
    const expiredRoom: RoomAccessRecord = {
      ...activeRoom,
      password_expires_at: new Date(Date.now() - 60_000).toISOString(),
    };
    const { repo, joined } = fakeRepository(expiredRoom);

    const preview = await previewRoomJoinWithPassword(repo, {
      roomCode: "AB23CD",
      password,
    });
    assert.deepEqual(preview, { ok: false, reason: "password_expired" });

    const result = await joinRoomWithPassword(repo, {
      roomCode: "AB23CD",
      password,
      userId: "7",
    });
    assert.deepEqual(result, { ok: false, reason: "password_expired" });
    assert.equal(joined.length, 0);
  });

  await test("a wrong password still gets the generic outcome after expiry", async () => {
    const expiredRoom: RoomAccessRecord = {
      ...activeRoom,
      password_expires_at: new Date(Date.now() - 60_000).toISOString(),
    };
    const { repo } = fakeRepository(expiredRoom);
    const result = await joinRoomWithPassword(repo, {
      roomCode: "AB23CD",
      password: "wrongpass",
      userId: "7",
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_credentials" });
  });

  await test("duplicate join is a success, not an error", async () => {
    const { repo, joined } = fakeRepository(activeRoom);
    const duplicateRepo: RoomAccessRepository = {
      findRoomByCode: repo.findRoomByCode,
      addMember: async (roomId, userId, role, registrationData) => {
        joined.push({ roomId, userId, role, registrationData });
        return { inserted: false };
      },
    };
    const result = await joinRoomWithPassword(duplicateRepo, {
      roomCode: "AB23CD",
      password,
      userId: "7",
    });
    assert.deepEqual(result, {
      ok: true,
      room: { id: "42", name: "Class 10 Maths" },
      ownerId: "",
    });
    assert.equal(joined.length, 1);
  });

  // ────────────────────────────────────────────────────────────────────────
  // Custom registration form
  // ────────────────────────────────────────────────────────────────────────
  const registrationRoom: RoomAccessRecord = {
    ...activeRoom,
    registration_form: {
      title: "Student registration",
      description: "Tell us who you are",
      fields: [
        { id: "rf_1", label: "Roll Number", type: "text", required: true },
        { id: "rf_2", label: "Email", type: "email", required: false },
        { id: "rf_3", label: "Section", type: "select", required: true, options: ["A", "B"] },
      ],
    },
  };

  await test("registration form normalizes and validates required answers", async () => {
    const form = normalizeRoomRegistrationForm(registrationRoom.registration_form);
    assert.equal(form.fields.length, 3);
    assert.equal(form.fields[0].required, true);

    const missing = validateRoomRegistrationData(form, {});
    assert.equal(missing.ok, false);
    assert.deepEqual(Object.keys(missing.fieldErrors).sort(), ["Roll Number", "Section"]);

    const valid = validateRoomRegistrationData(form, {
      "Roll Number": " 21CS1043 ",
      Section: "A",
      Ignored: "ignored",
    });
    assert.equal(valid.ok, true);
    assert.deepEqual(valid.values, { "Roll Number": "21CS1043", Section: "A" });

    const badEmail = validateRoomRegistrationData(form, {
      "Roll Number": "21CS1043",
      Section: "A",
      Email: "not-an-email",
    });
    assert.equal(badEmail.ok, false);
    assert.ok(badEmail.fieldErrors.Email);
  });

  await test("join rejects missing/invalid registration answers without adding a member", async () => {
    const { repo, joined } = fakeRepository(registrationRoom);
    const missing = await joinRoomWithPassword(repo, {
      roomCode: "AB23CD",
      password,
      userId: "7",
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.equal(missing.reason, "registration_invalid");
      if (missing.reason === "registration_invalid") {
        assert.ok(missing.fieldErrors["Roll Number"]);
      }
    }
    assert.equal(joined.length, 0);

    const badSelect = await joinRoomWithPassword(repo, {
      roomCode: "AB23CD",
      password,
      userId: "7",
      registrationData: { "Roll Number": "21CS1043", Section: "Z" },
    });
    assert.equal(badSelect.ok, false);
    assert.equal(joined.length, 0);
  });

  await test("join stores trimmed registration answers", async () => {
    const { repo, joined } = fakeRepository(registrationRoom);
    const result = await joinRoomWithPassword(repo, {
      roomCode: "AB23CD",
      password,
      userId: "7",
      registrationData: {
        "Roll Number": "  21CS1043  ",
        Email: "student@example.com",
        Section: "B",
        Unknown: "ignored",
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(joined[0].registrationData, {
      "Roll Number": "21CS1043",
      Email: "student@example.com",
      Section: "B",
    });
  });

  await test("join preview returns the form but does not add a member", async () => {
    const { repo, joined } = fakeRepository(registrationRoom);
    const preview = await previewRoomJoinWithPassword(repo, {
      roomCode: "AB23CD",
      password,
    });
    assert.equal(preview.ok, true);
    if (preview.ok) {
      assert.equal(preview.preview.room.name, "Class 10 Maths");
      assert.equal(preview.preview.registration_form.fields.length, 3);
      assert.equal(preview.preview.password_expires_at, null);
    }
    assert.equal(joined.length, 0);
  });

  await test("registration normalization drops duplicate labels and invalid ids", () => {
    const form = normalizeRoomRegistrationForm({
      title: "  Admission  ",
      fields: [
        { id: "bad id!", label: "Roll", type: "text", required: true },
        { id: "rf_2", label: "roll", type: "text", required: false },
        { id: "rf_3", label: "Choice", type: "select", required: true, options: [] },
      ],
    });
    assert.equal(form.title, "Admission");
    assert.equal(form.fields.length, 2);
    assert.equal(form.fields[0].id, "rf_1");
    assert.equal(form.fields[1].type, "text");
  });

  // ────────────────────────────────────────────────────────────────────────
  // Unique code allocation
  // ────────────────────────────────────────────────────────────────────────
  await test("unique code allocation retries collisions", async () => {
    const generated = ["AAAAAA", "BBBBBB", "CCCCCC"];
    const checked: string[] = [];
    const result = await insertRoomWithUniqueCode(
      {
        codeExists: async (code) => {
          checked.push(code);
          // First two candidates are already taken.
          return code === "AAAAAA" || code === "BBBBBB";
        },
        insertRoom: async (code) => ({ id: 1, code }),
        generateCode: () => generated.shift() || "ZZZZZZ",
      }
    );

    assert.deepEqual(result, { room: { id: 1, code: "CCCCCC" }, code: "CCCCCC" });
    assert.deepEqual(checked, ["AAAAAA", "BBBBBB", "CCCCCC"]);
  });

  await test("unique code allocation retries a unique-violation race", async () => {
    const generated = ["DDDDDD", "EEEEEE"];
    const result = await insertRoomWithUniqueCode({
      codeExists: async () => false,
      insertRoom: async (code) => {
        if (code === "DDDDDD") {
          const error = new Error("duplicate key") as Error & { code: string };
          error.code = "23505";
          throw error;
        }
        return { id: 2, code };
      },
      generateCode: () => generated.shift() || "FFFFFF",
    });

    assert.deepEqual(result, { room: { id: 2, code: "EEEEEE" }, code: "EEEEEE" });
  });

  console.log(`\n${passed} room access tests passed.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
