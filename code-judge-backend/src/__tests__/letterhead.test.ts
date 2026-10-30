import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildSignatureParams,
  isCustomHeaderPlan,
  isOwnedPublicId,
  signUploadParams,
} from "../services/letterhead.service.ts";
import {
  A4,
  MARGIN,
  computeHeaderRect,
  normalizeHeaderConfig,
  sanitizeLetterheadName,
} from "../utils/letterheadConfig.ts";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

console.log("\nCustom letterheads — backend policy and signatures");

test("signature params are complete, deterministic and scoped to the user folder", () => {
  const params = buildSignatureParams(42, new Date("2026-01-01T00:00:00Z"));
  assert.deepEqual(params, {
    timestamp: 1767225600,
    folder: "letterheads/42",
    allowed_formats: "pdf,png,jpg,jpeg",
    tags: "letterhead,user_42",
    overwrite: "false",
  });
  assert.equal(params.folder.startsWith("letterheads/42"), true);
});

test("upload signature matches Cloudinary's sorted-parameter algorithm", () => {
  const params = buildSignatureParams(7, new Date("2026-01-01T00:00:00Z"));
  const secret = "test-secret";
  const expected = createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key as keyof typeof params]}`)
        .join("&") + secret
    )
    .digest("hex");
  assert.equal(signUploadParams(params, secret), expected);
});

test("public ids must stay inside the authenticated user's folder", () => {
  assert.equal(isOwnedPublicId("letterheads/42/college-logo", 42), true);
  assert.equal(isOwnedPublicId("letterheads/42/college-logo", 43), false);
  assert.equal(isOwnedPublicId("letterheads/42abc/college-logo", 42), false);
  assert.equal(isOwnedPublicId("letterheads/42/../43/secret", 42), false);
  assert.equal(isOwnedPublicId(null, 42), false);
});

test("only paid Pro or Institute plans unlock custom headers", () => {
  assert.equal(isCustomHeaderPlan(false, "pro"), false);
  assert.equal(isCustomHeaderPlan(true, "free"), false);
  assert.equal(isCustomHeaderPlan(true, "basic"), false);
  assert.equal(isCustomHeaderPlan(true, "pro"), true);
  assert.equal(isCustomHeaderPlan(true, "institute"), true);
});

test("server clamps placements and keeps tall portraits below 40% of A4", () => {
  const config = normalizeHeaderConfig(
    {
      cropTop: 0.95,
      cropHeight: 4,
      widthPct: 9,
      offsetXmm: -999,
      offsetYmm: 999,
      align: "right",
      repeatOnAllPages: true,
    },
    500,
    3000
  );
  assert.equal(config.widthPct, 1);
  assert.equal(config.offsetXmm, -40);
  assert.equal(config.offsetYmm, 60);
  assert.equal(config.align, "right");
  assert.equal(config.repeatOnAllPages, true);
  const rect = computeHeaderRect(config, 500, 3000);
  assert.ok(rect.h <= A4.h * 0.4 + 0.001);
  assert.equal(rect.x + rect.w, A4.w - MARGIN + config.offsetXmm);
});

test("names are trimmed, whitespace-collapsed and capped", () => {
  assert.equal(sanitizeLetterheadName("  College   Header  "), "College Header");
  assert.throws(() => sanitizeLetterheadName("   "));
  assert.throws(() => sanitizeLetterheadName("x".repeat(61)));
});

console.log(`\n${passed} checks passed.`);
