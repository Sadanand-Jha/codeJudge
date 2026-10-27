import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  assertJwtSecretsConfigured,
  getJwtSecret,
  requireStrongSecret,
  signSessionToken,
  verifySessionToken,
} from "../config/jwt.ts";
import { ACCOUNT_ROLES, isAccountRole, normalizeAccountRole } from "../constants/accountRoles.ts";
import { authRegisterSchema } from "../middleware/validate.ts";
import { isPlatformOwner, platformOwnerRoles } from "../services/platformSession.ts";

const STRONG_SECRET = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
const originalEnv = {
  JWT_SECRET: process.env.JWT_SECRET,
  PLATFORM_JWT_SECRET: process.env.PLATFORM_JWT_SECRET,
  PLATFORM_OWNER_ROLES: process.env.PLATFORM_OWNER_ROLES,
  PLATFORM_OWNER_EMAILS: process.env.PLATFORM_OWNER_EMAILS,
};

// Missing and known-weak secrets must never be accepted.
delete process.env.JWT_SECRET;
assert.throws(() => getJwtSecret(), /JWT_SECRET is not configured/);
process.env.JWT_SECRET = "short";
assert.throws(() => getJwtSecret(), /too weak/);
process.env.JWT_SECRET = "i_am_iron_man";
assert.throws(() => getJwtSecret(), /too weak/);
assert.equal(requireStrongSecret("TEST_SECRET", STRONG_SECRET), STRONG_SECRET);

// A configured platform secret must be strong too.
process.env.JWT_SECRET = STRONG_SECRET;
process.env.PLATFORM_JWT_SECRET = "weak";
assert.throws(() => assertJwtSecretsConfigured(), /PLATFORM_JWT_SECRET is too weak/);
process.env.PLATFORM_JWT_SECRET = STRONG_SECRET;

// Round-trip a regular session token.
const token = signSessionToken({ userId: "42", email: "user@example.com" }, "1h");
assert.deepEqual(verifySessionToken(token), {
  userId: "42",
  email: "user@example.com",
});
assert.equal(verifySessionToken(token + "tampered"), null);

// Tokens signed with another algorithm are rejected even with the right secret.
const wrongAlgorithm = jwt.sign({ userId: "42", email: "user@example.com" }, STRONG_SECRET, {
  algorithm: "HS512",
  expiresIn: "1h",
});
assert.equal(verifySessionToken(wrongAlgorithm), null);

// Expired tokens are rejected.
const expired = signSessionToken({ userId: "42", email: "user@example.com" }, "-1s");
assert.equal(verifySessionToken(expired), null);

// Owner access is role-name based, never a numeric role id.
process.env.PLATFORM_OWNER_ROLES = "admin";
process.env.PLATFORM_OWNER_EMAILS = "";
assert.deepEqual(platformOwnerRoles(), ["admin"]);
assert.equal(isPlatformOwner("admin", ""), true);
assert.equal(isPlatformOwner("ADMIN", ""), true);
assert.equal(isPlatformOwner("teacher", ""), false);
assert.equal(isPlatformOwner(2, ""), false);

// The email allowlist still works for non-owner roles.
process.env.PLATFORM_OWNER_EMAILS = "owner@example.com";
assert.equal(isPlatformOwner("student", "owner@example.com"), true);
assert.equal(isPlatformOwner("student", "other@example.com"), false);

// Custom role lists are honored.
process.env.PLATFORM_OWNER_ROLES = "admin,owner";
assert.equal(isPlatformOwner("owner", ""), true);

// Public signup is limited to student/teacher at every boundary.
assert.deepEqual([...ACCOUNT_ROLES], ["student", "teacher"]);
assert.equal(normalizeAccountRole(" Student "), "student");
assert.equal(normalizeAccountRole("teacher"), "teacher");
for (const rejected of ["admin", "owner", "user", "", "student,teacher", 2, null, undefined]) {
  assert.equal(normalizeAccountRole(rejected), null);
  assert.equal(isAccountRole(rejected), false);
}

const registrationPayload = {
  username: "testuser",
  email: "test@example.com",
  password: "Password123",
  registration_token: "a".repeat(16),
  avatar_url: "/images/avatar-1.png",
  account_type: "student",
};
assert.equal(authRegisterSchema.safeParse(registrationPayload).success, true);
assert.equal(authRegisterSchema.safeParse({ ...registrationPayload, account_type: "teacher" }).success, true);
for (const rejected of ["admin", "owner", "user"]) {
  assert.equal(authRegisterSchema.safeParse({ ...registrationPayload, account_type: rejected }).success, false);
}

for (const [name, value] of Object.entries(originalEnv)) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

console.log("Security: secret strength, session verification, owner roles, and signup role restrictions passed.");
