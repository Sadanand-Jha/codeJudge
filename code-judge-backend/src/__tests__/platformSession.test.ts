import { strict as assert } from "node:assert";
import { isPlatformOwner, PLATFORM_OWNER_EMAIL } from "../services/platformSession.ts";

const originalAllowlist = process.env.PLATFORM_OWNER_EMAILS;
try {
  process.env.PLATFORM_OWNER_EMAILS = "another-admin@example.com";

  assert.equal(isPlatformOwner(PLATFORM_OWNER_EMAIL), true);
  assert.equal(isPlatformOwner(` ${PLATFORM_OWNER_EMAIL.toUpperCase()} `), true);
  assert.equal(isPlatformOwner("another-admin@example.com"), false);
  assert.equal(isPlatformOwner("admin@example.com"), false);

  console.log("✓ platform access is restricted to the configured owner email");
} finally {
  if (originalAllowlist === undefined) {
    delete process.env.PLATFORM_OWNER_EMAILS;
  } else {
    process.env.PLATFORM_OWNER_EMAILS = originalAllowlist;
  }
}
