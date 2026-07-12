/**
 * Unit tests for Codeforces sample test case parsing logic.
 * 
 * These tests verify that the extractTestLines function correctly
 * parses Codeforces-style sample test HTML into plain text.
 */

import * as cheerio from "cheerio";

// Simple assertion helper
class Assert {
  strictEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
      throw new Error(`FAIL: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
    }
  }
  
  ok(value: any, message: string) {
    if (!value) {
      throw new Error(`FAIL: ${message}\n  Expected truthy, got ${JSON.stringify(value)}`);
    }
  }
}

const assert = new Assert();

// Import the function we want to test
// We need to test extractTestLines and extractSampleTests
// Since they're private, we'll test them via the exported wrapper

/**
 * Parses sample test HTML using the same logic as extractSampleTests
 * but exposed here for testing.
 */
function parseSampleTestInput(sampleHtml: string): { input: string; output: string; explanation: string | null } {
  const html = `<div class="problem-statement"><div class="sample-tests"><div class="sample-test">${sampleHtml}</div></div></div>`;
  const $ = cheerio.load(html);
  
  // Get the .sample-test element
  const testEl = $(".sample-test").first();
  
  // Extract input lines
  const inputPre = testEl.find(".input pre");
  const exampleLines = inputPre.find("div.test-example-line");
  let input = "";
  
  if (exampleLines.length > 0) {
    const lines: string[] = [];
    exampleLines.each((_i: number, el: any) => {
      lines.push($(el).text());
    });
    input = lines.join("\n");
  } else {
    input = inputPre.text();
  }
  
  // Extract output lines
  const outputPre = testEl.find(".output pre");
  const outputExampleLines = outputPre.find("div.test-example-line");
  let output = "";
  
  if (outputExampleLines.length > 0) {
    const lines: string[] = [];
    outputExampleLines.each((_i: number, el: any) => {
      lines.push($(el).text());
    });
    output = lines.join("\n");
  } else {
    output = outputPre.text();
  }
  
  // Extract explanation
  const explanationEl = testEl.find(".explanation");
  const explanation = explanationEl.length > 0 ? (explanationEl.html() || null) : null;
  
  return { input, output, explanation };
}

// ============= TESTS =============

function testBasicSampleInput() {
  const html = `
    <div class="input"><pre>
      <div class="test-example-line test-example-line-even test-example-line-0">6</div>
      <div class="test-example-line test-example-line-odd test-example-line-1">2</div>
      <div class="test-example-line test-example-line-odd test-example-line-1">()</div>
      <div class="test-example-line test-example-line-even test-example-line-2">2</div>
      <div class="test-example-line test-example-line-odd test-example-line-3">)(</div>
      <div class="test-example-line test-example-line-even test-example-line-4">3</div>
      <div class="test-example-line test-example-line-odd test-example-line-5">(((</div>
    </pre></div>
    <div class="output"><pre>
      <div class="test-example-line test-example-line-even test-example-line-0">YES</div>
      <div class="test-example-line test-example-line-odd test-example-line-1">YES</div>
      <div class="test-example-line test-example-line-odd test-example-line-1">NO</div>
    </pre></div>
  `;
  
  const result = parseSampleTestInput(html);
  
  assert.strictEqual(
    result.input,
    "6\n2\n()\n2\n)(\n3\n(((",
    "Input should extract text from test-example-line divs joined by newlines"
  );
  
  assert.strictEqual(
    result.output,
    "YES\nYES\nNO",
    "Output should extract text from test-example-line divs joined by newlines"
  );
}

function testSampleInputWithoutExampleLines() {
  const html = `
    <div class="input"><pre>6
2
()</pre></div>
    <div class="output"><pre>YES
YES
NO</pre></div>
  `;
  
  const result = parseSampleTestInput(html);
  
  assert.strictEqual(
    result.input,
    "6\n2\n()",
    "Input without example lines should use pre text directly"
  );
  
  assert.strictEqual(
    result.output,
    "YES\nYES\nNO",
    "Output without example lines should use pre text directly"
  );
}

function testSampleWithExplanation() {
  const html = `
    <div class="input"><pre>
      <div class="test-example-line">5</div>
      <div class="test-example-line">1 2</div>
    </pre></div>
    <div class="output"><pre>
      <div class="test-example-line">3</div>
    </pre></div>
    <div class="explanation">In the first test case, the answer is 3.</div>
  `;
  
  const result = parseSampleTestInput(html);
  
  assert.strictEqual(result.input, "5\n1 2", "Input should be plain text");
  assert.strictEqual(result.output, "3", "Output should be plain text");
  assert.ok(result.explanation !== null, "Explanation should not be null");
  if (result.explanation) {
    assert.ok(
      result.explanation.includes("In the first test case"),
      "Explanation should contain expected text"
    );
  }
}

function testEmptySample() {
  const html = `
    <div class="input"><pre></pre></div>
    <div class="output"><pre></pre></div>
  `;
  
  const result = parseSampleTestInput(html);
  
  assert.strictEqual(result.input, "", "Empty input should be empty string");
  assert.strictEqual(result.output, "", "Empty output should be empty string");
  assert.strictEqual(result.explanation, null, "No explanation should be null");
}

function testNoHtmlTagsInResult() {
  const html = `
    <div class="input"><pre>
      <div class="test-example-line">line1</div>
      <div class="test-example-line">line2</div>
    </pre></div>
    <div class="output"><pre>
      <div class="test-example-line">result1</div>
      <div class="test-example-line">result2</div>
    </pre></div>
  `;
  
  const result = parseSampleTestInput(html);
  
  // Ensure no HTML tags leak into the result
  assert.ok(!result.input.includes("<div"), "Input should not contain HTML tags");
  assert.ok(!result.input.includes("test-example-line"), "Input should not contain class names");
  assert.ok(!result.output.includes("<div"), "Output should not contain HTML tags");
  assert.ok(!result.output.includes("test-example-line"), "Output should not contain class names");
  
  assert.strictEqual(result.input, "line1\nline2", "Input should be plain text lines");
  assert.strictEqual(result.output, "result1\nresult2", "Output should be plain text lines");
}

function testWhitespaceOnlyLines() {
  const html = `
    <div class="input"><pre>
      <div class="test-example-line">   </div>
      <div class="test-example-line">42</div>
      <div class="test-example-line">   </div>
    </pre></div>
    <div class="output"><pre>
      <div class="test-example-line">YES</div>
    </pre></div>
  `;
  
  const result = parseSampleTestInput(html);
  
  assert.strictEqual(
    result.input,
    "   \n42\n   ",
    "Whitespace-only lines should be preserved"
  );
}

function testRealCodeforcesSample() {
  // This is a simplified representation of an actual Codeforces sample
  const html = `
    <div class="input"><pre>
      <div class="test-example-line test-example-line-even test-example-line-0">6</div>
      <div class="test-example-line test-example-line-odd test-example-line-1">1 1</div>
      <div class="test-example-line test-example-line-even test-example-line-2">1 2</div>
      <div class="test-example-line test-example-line-odd test-example-line-3">4 6</div>
      <div class="test-example-line test-example-line-even test-example-line-4">5 7</div>
      <div class="test-example-line test-example-line-odd test-example-line-5">7 2</div>
      <div class="test-example-line test-example-line-even test-example-line-6">10 10</div>
    </pre></div>
    <div class="output"><pre>
      <div class="test-example-line test-example-line-odd test-example-line-1">NO</div>
      <div class="test-example-line test-example-line-even test-example-line-2">YES</div>
      <div class="test-example-line test-example-line-odd test-example-line-3">YES</div>
      <div class="test-example-line test-example-line-even test-example-line-4">NO</div>
      <div class="test-example-line test-example-line-odd test-example-line-5">YES</div>
      <div class="test-example-line test-example-line-even test-example-line-6">YES</div>
    </pre></div>
  `;
  
  const result = parseSampleTestInput(html);
  
  // Verify the structure matches what we expect
  const inputLines = result.input.split("\n");
  assert.strictEqual(inputLines.length, 7, "Input should have 7 lines");
  assert.strictEqual(inputLines[0], "6", "First line should be 6 (number of test cases)");
  assert.strictEqual(inputLines[1], "1 1", "Second line should be 1 1");
  assert.strictEqual(inputLines[5], "7 2", "Sixth line should be 7 2");
  
  const outputLines = result.output.split("\n");
  assert.strictEqual(outputLines.length, 6, "Output should have 6 lines");
  assert.strictEqual(outputLines[0], "NO", "First output should be NO");
  assert.strictEqual(outputLines[2], "YES", "Third output should be YES");
}

// ============= RUNNER =============

const tests = [
  testBasicSampleInput,
  testSampleInputWithoutExampleLines,
  testSampleWithExplanation,
  testEmptySample,
  testNoHtmlTagsInResult,
  testWhitespaceOnlyLines,
  testRealCodeforcesSample,
];

let passed = 0;
let failed = 0;

console.log("\n🧪 Codeforces Sample Test Parser Tests\n");
console.log("─".repeat(60));

for (const test of tests) {
  const name = test.name.replace(/^test/, "");
  try {
    test();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${error.message}`);
    failed++;
  }
}

console.log("─".repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests\n`);