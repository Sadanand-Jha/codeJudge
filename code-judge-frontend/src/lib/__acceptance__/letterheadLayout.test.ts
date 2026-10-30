import assert from "node:assert/strict";
import {
  A4,
  MARGIN,
  computeHeaderRect,
  normalizeHeaderConfig,
} from "@/utils/letterheadLayout";
import { canUseCustomHeader } from "@/lib/planAccess";
import { DEFAULT_HEADER_CONFIG } from "@/config/letterheads";
import { validateLetterheadFile } from "@/utils/letterheadUpload";
import { buildPaperDocument, buildPaperPreviewDocument } from "@/utils/paperHtml";

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

console.log("\nCustom letterheads — layout and access");

test("A4 header rect follows the shared millimetre formula", () => {
  const rect = computeHeaderRect(
    {
      cropHeight: 0.2,
      widthPct: 1,
      align: "center",
      offsetXmm: 0,
      offsetYmm: 12,
    },
    1600,
    400
  );
  const contentW = A4.w - 2 * MARGIN;
  const width = contentW;
  const height = width * ((400 * 0.2) / 1600);
  assert.equal(rect.w, width);
  assert.equal(rect.h, height);
  assert.equal(rect.x, MARGIN);
  assert.equal(rect.y, 12);
  assert.equal(rect.bottom, 12 + height);
});

test("horizontal alignment and offsets stay inside the A4 margins", () => {
  const base = {
    cropHeight: 0.1,
    widthPct: 0.5,
    offsetXmm: 0,
    offsetYmm: 0,
  };
  const left = computeHeaderRect({ ...base, align: "left" }, 1000, 200);
  const center = computeHeaderRect({ ...base, align: "center" }, 1000, 200);
  const right = computeHeaderRect({ ...base, align: "right" }, 1000, 200);
  assert.equal(left.x, MARGIN);
  assert.equal(center.x, MARGIN + (A4.w - 2 * MARGIN - center.w) / 2);
  assert.equal(right.x + right.w, A4.w - MARGIN);
  assert.equal(
    computeHeaderRect({ ...base, align: "center", offsetXmm: 5 }, 1000, 200).x,
    center.x + 5
  );
});

test("config values are clamped and tall images are cropped to leave room", () => {
  const normalized = normalizeHeaderConfig(
    {
      cropTop: 0.95,
      cropHeight: 4,
      widthPct: 9,
      offsetXmm: 999,
      offsetYmm: -50,
      align: "left",
      repeatOnAllPages: true,
    },
    600,
    2400
  );
  assert.equal(normalized.widthPct, 1);
  assert.equal(normalized.offsetXmm, 40);
  assert.equal(normalized.offsetYmm, 0);
  assert.equal(normalized.align, "left");
  assert.equal(normalized.repeatOnAllPages, true);
  assert.ok(normalized.cropHeight >= 0.05);
  assert.ok(normalized.cropTop + normalized.cropHeight <= 1);
  const rect = computeHeaderRect(normalized, 600, 2400);
  assert.ok(rect.h <= A4.h * 0.4 + 0.001);
});

test("missing config falls back to the standard header defaults", () => {
  const normalized = normalizeHeaderConfig(undefined);
  assert.deepEqual(normalized, DEFAULT_HEADER_CONFIG);
  assert.equal(normalized.align, "center");
  assert.equal(normalized.repeatOnAllPages, false);
});

test("uploads require a matching extension, MIME type and a 10 MB ceiling", () => {
  assert.equal(validateLetterheadFile({ name: "college.pdf", type: "application/pdf", size: 2000 }).ok, true);
  assert.equal(validateLetterheadFile({ name: "college.PNG", type: "image/png", size: 2000 }).ok, true);
  assert.equal(validateLetterheadFile({ name: "college.jpg", type: "image/jpeg", size: 2000 }).ok, true);
  assert.equal(validateLetterheadFile({ name: "college.exe", type: "application/pdf", size: 2000 }).ok, false);
  assert.equal(validateLetterheadFile({ name: "college.pdf", type: "image/png", size: 2000 }).ok, false);
  assert.equal(validateLetterheadFile({ name: "college.pdf", type: "application/pdf", size: 0 }).ok, false);
  assert.equal(
    validateLetterheadFile({ name: "college.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 }).ok,
    false
  );
});

test("the custom header is injected identically into preview and print HTML", () => {
  const base = {
    meta: { title: "Mid Semester" },
    questions: [],
  };
  const header = {
    dataUrl: "data:image/png;base64,AAAA",
    rect: { x: 15, y: 15, w: 180, h: 30, bottom: 45 },
    repeatOnAllPages: false,
    gapMm: 8,
  };
  const html = buildPaperDocument({ ...base, header }, "");
  assert.match(html, /class="paper has-lh"/);
  assert.match(html, /class="lh lh-first"/);
  assert.match(html, /height:38mm/);
  assert.equal(html.includes("@page { margin-top:"), false);

  const repeatHeader = { ...header, repeatOnAllPages: true };
  const preview = buildPaperPreviewDocument({ ...base, header: repeatHeader }, "", "paper");
  assert.match(preview, /class="lh lh-first"/);
  assert.match(preview, /height:53mm/);

  const print = buildPaperDocument({ ...base, header: repeatHeader }, "");
  assert.match(print, /@page \{ margin-top: 53mm; \}/);
  assert.match(print, /class="lh lh-repeat"/);
  assert.match(print, /position:fixed/);

  const standard = buildPaperDocument(base, "");
  assert.equal(standard.includes('class="paper has-lh"'), false);
  assert.equal(standard.includes("data:image/png"), false);
});

test("only paid pro or institute plans can use custom headers", () => {
  assert.equal(canUseCustomHeader(null), false);
  assert.equal(canUseCustomHeader({ isPaid: false, planSlug: "pro" }), false);
  assert.equal(canUseCustomHeader({ isPaid: true, planSlug: "free" }), false);
  assert.equal(canUseCustomHeader({ isPaid: true, planSlug: "basic" }), false);
  assert.equal(canUseCustomHeader({ isPaid: true, planSlug: "pro" }), true);
  assert.equal(canUseCustomHeader({ isPaid: true, planSlug: "institute" }), true);
});

console.log(`\n${passed} checks passed.`);
