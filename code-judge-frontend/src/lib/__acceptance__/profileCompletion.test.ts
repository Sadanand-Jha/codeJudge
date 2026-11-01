/**
 * Profile completion gate: students with only a username are prompted once,
 * while teachers and students with a real name are not. Run with `npm test`.
 */
import { strict as assert } from "node:assert";
import {
  hasProfileFullName,
  needsProfileCompletion,
  PROFILE_EDIT_PATH,
} from "@/utils/profileCompletion";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

test("a display name counts as a completed profile name", () => {
  assert.equal(
    hasProfileFullName({ displayName: "Sadanand Jha", firstName: null, lastName: null }),
    true
  );
});

test("first or last name counts when no display name is set", () => {
  assert.equal(
    hasProfileFullName({ displayName: null, firstName: "Sadanand", lastName: null }),
    true
  );
  assert.equal(
    hasProfileFullName({ displayName: "  ", firstName: null, lastName: "Jha" }),
    true
  );
  assert.equal(
    hasProfileFullName({ displayName: "", firstName: "", lastName: "" }),
    false
  );
});

test("students without a name need to complete their profile", () => {
  assert.equal(
    needsProfileCompletion({
      role: "student",
      displayName: null,
      firstName: null,
      lastName: null,
    }),
    true
  );
  assert.equal(
    needsProfileCompletion({
      role: "STUDENT",
      displayName: "Sadanand",
      firstName: null,
      lastName: null,
    }),
    false
  );
});

test("teachers and signed-out users are never prompted", () => {
  assert.equal(
    needsProfileCompletion({
      role: "teacher",
      displayName: null,
      firstName: null,
      lastName: null,
    }),
    false
  );
  assert.equal(needsProfileCompletion(null), false);
});

test("the edit-profile redirect targets the profile section", () => {
  assert.equal(PROFILE_EDIT_PATH, "/settings#profile");
});

console.log(`${passed} profile completion tests passed.`);
