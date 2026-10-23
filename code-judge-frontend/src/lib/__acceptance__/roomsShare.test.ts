/**
 * Room share/join helpers: input normalization and the exact WhatsApp
 * message template. Run with `npm test`.
 */
import { strict as assert } from "node:assert";
import {
  buildRoomJoinLink,
  buildRoomShareMessage,
  buildWhatsAppHref,
  isValidRoomCodeInput,
  normalizeRoomCodeInput,
  parseRoomInvitePassword,
} from "@/utils/roomShare";
import {
  formatPasswordExpiry,
  formatPasswordExpiryRelative,
  isPasswordExpired,
} from "@/utils/passwordExpiry";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

test("room code input keeps only A-Z0-9 and uppercases", () => {
  assert.equal(normalizeRoomCodeInput(" ab-23cd "), "AB23CD");
  assert.equal(normalizeRoomCodeInput("ab23cdef"), "AB23CD");
  assert.equal(normalizeRoomCodeInput("a!b@2#3$c%d"), "AB23CD");
});

test("room code validation requires exactly six characters", () => {
  assert.equal(isValidRoomCodeInput("AB23CD"), true);
  assert.equal(isValidRoomCodeInput("AB23C"), false);
  assert.equal(isValidRoomCodeInput("AB23CDE"), false);
  assert.equal(isValidRoomCodeInput("AB-3CD"), false);
});

test("share message matches the requested template exactly", () => {
  const message = buildRoomShareMessage({
    roomName: "Class 10 Maths",
    roomCode: "AB23CD",
    password: "maple7x",
    appUrl: "https://www.quizsupport.com",
    creatorUsername: "quizteacher",
  });

  assert.equal(
    message,
    "📚 Join my class: Class 10 Maths\nTeacher: @quizteacher\n\n1. Tap to join: https://www.quizsupport.com/rooms?code=AB23CD#p=maple7x\n2. Room code: AB23CD\n3. Password: maple7x"
  );
});

test("creator username is normalized and included in the share message", () => {
  const message = buildRoomShareMessage({
    roomName: "Physics",
    roomCode: "XY34ZW",
    password: "abc12345",
    appUrl: "https://www.quizsupport.com",
    creatorUsername: "@sadanand",
  });
  assert.ok(message.includes("Teacher: @sadanand"));
  assert.ok(!message.includes("@@"), "username must not get a double @");
});

test("share message normalizes a trailing slash on APP_URL", () => {
  const message = buildRoomShareMessage({
    roomName: "Physics",
    roomCode: "XY34ZW",
    password: "abc12345",
    appUrl: "http://localhost:3000/",
  });
  assert.ok(message.includes("1. Tap to join: http://localhost:3000/rooms?code=XY34ZW#p=abc12345"));
  assert.ok(!message.includes("3000//rooms"));
});

test("join link keeps the password in the fragment", () => {
  const link = buildRoomJoinLink({
    roomCode: "ab23cd",
    password: "p@ss word#1",
    appUrl: "https://www.quizsupport.com/",
  });
  assert.equal(link, "https://www.quizsupport.com/rooms?code=AB23CD#p=p%40ss%20word%231");
  assert.ok(!link.split("#")[0].includes("p%40ss"), "password must not be in the query");
});

test("invite password parses from #p= and ignores empty/oversized values", () => {
  assert.equal(parseRoomInvitePassword("#p=maple7x"), "maple7x");
  assert.equal(parseRoomInvitePassword("#password=maple7x"), "maple7x");
  assert.equal(parseRoomInvitePassword(""), null);
  assert.equal(parseRoomInvitePassword("#p="), null);
  assert.equal(parseRoomInvitePassword(`#p=${"a".repeat(129)}`), null);
});

test("share message appends the password expiry in IST", () => {
  const message = buildRoomShareMessage({
    roomName: "Physics",
    roomCode: "XY34ZW",
    password: "abc12345",
    appUrl: "https://www.quizsupport.com",
    passwordExpiresAt: "2026-10-24T13:00:00.000Z",
  });
  assert.ok(
    message.endsWith(
      "3. Password: abc12345\n4. Password valid till: 24 Oct 2026, 6:30 pm IST"
    ),
    message
  );
});

test("password expiry is formatted for the Kolkata region", () => {
  assert.equal(
    formatPasswordExpiry("2026-10-24T13:00:00.000Z"),
    "24 Oct 2026, 6:30 pm IST"
  );
  assert.equal(formatPasswordExpiry(null), "Does not expire");
  assert.equal(
    formatPasswordExpiryRelative("2026-10-24T13:00:00.000Z", Date.parse("2026-10-24T11:00:00.000Z")),
    "Expires in 2h"
  );
  assert.equal(
    isPasswordExpired("2026-10-24T13:00:00.000Z", Date.parse("2026-10-24T13:00:00.000Z")),
    true
  );
  assert.equal(isPasswordExpired(null), false);
});

test("WhatsApp link URI-encodes the whole message", () => {
  const message = buildRoomShareMessage({
    roomName: "Maths & Science",
    roomCode: "AB23CD",
    password: "maple7x",
    appUrl: "https://www.quizsupport.com",
  });
  const href = buildWhatsAppHref(message);
  assert.ok(href.startsWith("https://wa.me/?text="));
  const encoded = href.slice("https://wa.me/?text=".length);
  assert.equal(decodeURIComponent(encoded), message);
});

console.log(`\n${passed} room share tests passed.\n`);
