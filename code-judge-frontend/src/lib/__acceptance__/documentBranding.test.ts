import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  BRANDING,
  BRANDING_ATTRIBUTE,
  brandingInvariants,
  brandingRect,
  canDeleteTarget,
  clampFreeBlockToPage,
  containsBrandingText,
  isProtectedBrandingNode,
  stripBrandingText,
  touchesBrandingZone,
} from "../documentEditor/branding";
import { DEFAULT_SETTINGS, createSeedDocument, createSetVariant, computeTotals, renumberQuestions } from "../documentEditor/model";
import { pageDimensions } from "../documentEditor/types";

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

console.log("\nDocument Studio — branding lock acceptance");

test("branding is a frozen system layer outside the editable document", () => {
  assert.equal(BRANDING.locked, true);
  assert.equal(BRANDING.system, true);
  assert.equal(BRANDING.opacity, 1);
  assert.throws(() => {
    (BRANDING as { name: string }).name = "Removed";
  });
  const document = createSeedDocument();
  const serialized = JSON.stringify(document);
  assert.equal(serialized.includes("data-qs-protected-branding"), false);
  assert.equal("branding" in document, false);
});

test("branding invariant validator rejects every tampering attempt", () => {
  const valid = brandingInvariants({
    locked: true,
    system: true,
    opacity: 1,
    visible: true,
    topMost: true,
    covered: false,
  });
  assert.equal(valid.ok, true);

  const attempts = [
    { locked: false },
    { system: false },
    { opacity: 0.4 },
    { visible: false },
    { topMost: false },
    { covered: true },
  ];
  for (const attempt of attempts) {
    const result = brandingInvariants({
      locked: true,
      system: true,
      opacity: 1,
      visible: true,
      topMost: true,
      covered: false,
      ...attempt,
    });
    assert.equal(result.ok, false);
  }
});

test("branding safe area follows page size and orientation", () => {
  const a4 = brandingRect(DEFAULT_SETTINGS);
  const page = pageDimensions(DEFAULT_SETTINGS);
  assert.equal(a4.right, page.width - BRANDING.safeArea.rightMm);
  assert.equal(a4.bottom, page.height - BRANDING.safeArea.bottomMm);
  assert.ok(a4.left > 0 && a4.top > 0);

  const landscape = brandingRect({ ...DEFAULT_SETTINGS, orientation: "landscape" });
  assert.notEqual(landscape.right, a4.right);
});

test("free blocks cannot be placed over the protected branding", () => {
  const zone = brandingRect(DEFAULT_SETTINGS);
  const overlap = {
    placement: "free" as const,
    x: zone.left + 2,
    y: zone.top + 2,
    width: 30,
    height: 8,
  };
  assert.equal(touchesBrandingZone(overlap, DEFAULT_SETTINGS), true);

  const clamped = clampFreeBlockToPage(overlap, DEFAULT_SETTINGS);
  const after = {
    placement: "free" as const,
    ...clamped,
  };
  assert.equal(touchesBrandingZone(after, DEFAULT_SETTINGS), false);
});

test("delete targets inside the protected layer are blocked", () => {
  const dom = new JSDOM(
    `<main data-qs-editor-root>
      <div contenteditable="true"><p>Editable text</p></div>
      <footer ${BRANDING_ATTRIBUTE}="true" data-qs-editor-root><span id="brand-child">QuizSupport</span></footer>
    </main>`
  );
  const { document } = dom.window;
  const child = document.getElementById("brand-child");
  const editable = document.querySelector("[contenteditable]");
  assert.equal(isProtectedBrandingNode(child), true);
  assert.equal(canDeleteTarget(child), false);
  assert.equal(canDeleteTarget(editable), true);

  // Simulate Select All + Delete inside contentEditable only. The protected
  // footer lives outside the editable tree, so it must still be present.
  editable!.textContent = "";
  assert.equal(document.querySelector(`[${BRANDING_ATTRIBUTE}="true"]`)?.textContent, "QuizSupport");
});

test("branding text cannot survive import/find-replace", () => {
  assert.equal(containsBrandingText("ADA Assignment · Quiz Support"), true);
  assert.equal(stripBrandingText("ADA Assignment · Quiz Support"), "ADA Assignment ·");
  assert.equal(stripBrandingText("Page 1 of 2"), "Page 1 of 2");
});

test("question renumbering and set shuffling never touch branding", () => {
  const document = createSeedDocument();
  const renumbered = renumberQuestions(document);
  const labels = renumbered.pages.flatMap((page) =>
    page.blocks.filter((block) => block.type === "question").map((block) => block.questionNumber)
  );
  assert.deepEqual(labels, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(JSON.stringify(renumbered).includes("data-qs-protected-branding"), false);

  const setB = createSetVariant(renumbered, "B", 42);
  assert.equal(setB.meta.setLabel, "B");
  assert.equal(JSON.stringify(setB).includes("data-qs-protected-branding"), false);
  assert.equal(computeTotals(setB).total, 50);
});

console.log(`\n${passed} branding-lock checks passed.\n`);
