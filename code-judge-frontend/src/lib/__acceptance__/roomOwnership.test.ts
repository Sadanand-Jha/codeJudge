/**
 * Teacher workspace isolation: only rooms owned by the authenticated user are
 * visible. Run with `npm test`.
 */
import { strict as assert } from "node:assert";
import { getOwnedRooms } from "@/store/roomStore";
import type { Room } from "@/types/room";

function room(id: string, ownerId?: string): Room {
  return {
    id,
    name: `Room ${id}`,
    ownerId,
    createdAt: "2026-10-23T00:00:00.000Z",
    updatedAt: "2026-10-23T00:00:00.000Z",
    archived: false,
    students: [],
  };
}

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

const rooms = [
  room("1", "teacher-a"),
  room("2", "teacher-b"),
  room("3"),
  room("4", "teacher-a"),
];

test("returns only rooms owned by the current teacher", () => {
  assert.deepEqual(
    getOwnedRooms(rooms, "teacher-a").map((r) => r.id),
    ["1", "4"]
  );
  assert.deepEqual(
    getOwnedRooms(rooms, "teacher-b").map((r) => r.id),
    ["2"]
  );
});

test("hides another teacher's rooms when the current teacher owns none", () => {
  assert.deepEqual(getOwnedRooms(rooms, "teacher-c"), []);
});

test("never shows ownerless rooms", () => {
  assert.deepEqual(getOwnedRooms([room("orphan")], "teacher-a"), []);
});

test("returns no rooms before the user is available", () => {
  assert.deepEqual(getOwnedRooms(rooms, undefined), []);
  assert.deepEqual(getOwnedRooms(rooms, null), []);
  assert.deepEqual(getOwnedRooms(rooms, ""), []);
});

console.log(`${passed} room ownership tests passed.`);
