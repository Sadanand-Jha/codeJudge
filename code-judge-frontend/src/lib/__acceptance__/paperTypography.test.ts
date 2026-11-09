import assert from "node:assert/strict";
import { pdfSafeText } from "@/utils/questionSetExport";

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

console.log("\nQuestion paper PDF — typography safety");

test("unicode and soft hyphens render as plain hyphens", () => {
  assert.equal(pdfSafeText("first\u2011order"), "first-order");
  assert.equal(pdfSafeText("first\u2010order"), "first-order");
  assert.equal(pdfSafeText("first\u00adorder"), "first-order");
  assert.equal(pdfSafeText("non\u2011breaking hyphen"), "non-breaking hyphen");
});

test("plain ASCII hyphens and text are untouched", () => {
  assert.equal(pdfSafeText("first-order logic"), "first-order logic");
  assert.equal(pdfSafeText("no special characters"), "no special characters");
});

test("math glyph fallbacks still map to readable ASCII", () => {
  assert.equal(pdfSafeText("x \u2208 A"), "x  in  A");
  assert.equal(pdfSafeText("x \u2209 A"), "x  not in  A");
  assert.equal(pdfSafeText("A \u2282 B"), "A  subset of  B");
  assert.equal(pdfSafeText("A \u2286 B"), "A  subset of or equal to  B");
  assert.equal(pdfSafeText("A \u222a B"), "A  union  B");
  assert.equal(pdfSafeText("\u2207f"), " grad f");
  assert.equal(pdfSafeText("p \u21d2 q"), "p  =>  q");
  assert.equal(pdfSafeText("p \u21d0 q"), "p  <=  q");
});

console.log(`\n  ${passed} checks passed`);
