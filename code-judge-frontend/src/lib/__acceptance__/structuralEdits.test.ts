/**
 * Regression tests for structural safety of inline code edits:
 *  - insert at end of function / if block / for loop lands BEFORE the closing
 *    brace, never after it;
 *  - a diff that "replaces" the trailing `}` with the new statement is repaired
 *    into an insertion that keeps the brace;
 *  - closing braces/brackets are never accidentally deleted;
 *  - balanced `{}`, `()`, `[]` after every application.
 *
 * Run:  npx tsx src/lib/__acceptance__/structuralEdits.test.ts
 * (pure TS, no path alias needed at runtime)
 */
import { strict as assert } from "node:assert";
import {
  parseEditsFromResponse,
  sanitizeStructuralEdits,
  normalizeEditIndentation,
  applyEditsToText,
  validateStructuralBalance,
  repairDeletedDelimiters,
  snapInsertionBeforeLastCloser,
  analyzeStructure,
  inferIndentStyle,
  type AIEdit,
} from "../codeEdits";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

/** Full panel pipeline: parse → sanitize → normalize indent → apply. */
function pipeline(file: string, rawResponse: string): string {
  const { content, edits } = parseEditsFromResponse(rawResponse);
  void content;
  const flat = edits.flatMap((g) => g.edits);
  const safe = sanitizeStructuralEdits(file, flat);
  const normalized = normalizeEditIndentation(file, safe);
  return applyEditsToText(file, normalized);
}

const bt = String.fromCharCode(96);
const fence = (body: string) => `${bt}${bt}${bt}diff\n${body}${bt}${bt}${bt}`;

// ──────────────────────────────────────────────────────────────────────────
// 1. Insert at end of function — diff replaces the trailing `}` (the bug).
// ──────────────────────────────────────────────────────────────────────────
test("insert at end of function keeps the closing brace", () => {
  const file = [
    "void solve() {",
    "    int n, k;",
    "    cin >> n >> k;",
    '    cout << "Ready." << endl;',
    "}",
  ].join("\n");

  const out = pipeline(
    file,
    `Add the sum.\n\n${fence(
      "@@ -5,1 +5,1 @@\n-}\n+cout << n + k << endl;"
    )}`
  );

  assert.equal(
    out,
    [
      "void solve() {",
      "    int n, k;",
      "    cin >> n >> k;",
      '    cout << "Ready." << endl;',
      "    cout << n + k << endl;",
      "}",
    ].join("\n")
  );
  assert.equal((out.match(/\}/g) || []).length, 1, "closing brace survives");
});

// ──────────────────────────────────────────────────────────────────────────
// 2. Insert at end of an if block.
// ──────────────────────────────────────────────────────────────────────────
test("insert at end of if block lands before its closing brace", () => {
  const file = [
    "void f(int x) {",
    "    if (x > 0) {",
    "        cout << x;",
    "    }",
    '    cout << "done";',
    "}",
  ].join("\n");

  const out = pipeline(
    file,
    `Add a debug print.\n\n${fence(
      "@@ -4,1 +4,1 @@\n-    }\n+    cout << x + 1;"
    )}`
  );

  assert.equal(
    out,
    [
      "void f(int x) {",
      "    if (x > 0) {",
      "        cout << x;",
      "        cout << x + 1;",
      "    }",
      '    cout << "done";',
      "}",
    ].join("\n")
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 3. Insert at end of a for loop.
// ──────────────────────────────────────────────────────────────────────────
test("insert at end of for loop lands before its closing brace", () => {
  const file = [
    "for (int i = 1; i <= n; i++) {",
    "    sum += i;",
    "}",
  ].join("\n");

  const out = pipeline(
    file,
    `Also double the sum.\n\n${fence(
      "@@ -3,1 +3,1 @@\n-}\n+sum *= 2;"
    )}`
  );

  assert.equal(
    out,
    [
      "for (int i = 1; i <= n; i++) {",
      "    sum += i;",
      "    sum *= 2;",
      "}",
    ].join("\n")
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 4. Insert multiple lines before a closing brace.
// ──────────────────────────────────────────────────────────────────────────
test("insert multiple lines before the closing brace", () => {
  const file = [
    "for (int i = 1; i <= n; i++) {",
    "    sum += i;",
    "}",
  ].join("\n");

  const out = pipeline(
    file,
    `Log and double.\n\n${fence(
      "@@ -3,1 +3,3 @@\n-}\n+cout << i << \" \";\n+sum += i * 2;"
    )}`
  );

  assert.equal(
    out,
    [
      "for (int i = 1; i <= n; i++) {",
      "    sum += i;",
      '    cout << i << " ";',
      "    sum += i * 2;",
      "}",
    ].join("\n")
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 5. Nested functions/blocks — insert into the INNER block's closing brace.
// ──────────────────────────────────────────────────────────────────────────
test("nested blocks: insertion targets the inner block, not the outer", () => {
  const file = [
    "void f(int a, int b) {",
    "    if (a) {",
    "        if (b) {",
    "            doB();",
    "        }",
    "    }",
    "}",
  ].join("\n");

  const out = pipeline(
    file,
    `Call doC too.\n\n${fence(
      "@@ -5,1 +5,1 @@\n-        }\n+        doC();"
    )}`
  );

  assert.equal(
    out,
    [
      "void f(int a, int b) {",
      "    if (a) {",
      "        if (b) {",
      "            doB();",
      "            doC();",
      "        }",
      "    }",
      "}",
    ].join("\n")
  );
});

// ──────────────────────────────────────────────────────────────────────────
// 6. Closing braces are never accidentally deleted.
// ──────────────────────────────────────────────────────────────────────────
test("pure end-of-file insertion is snapped before the closing brace", () => {
  const file = ["void solve() {", "    int n, k;", "}"].join("\n");

  const out = pipeline(
    file,
    `Print the sum.\n\n${fence(
      "@@ -4,0 +4,1 @@\n+    cout << n + k << endl;"
    )}`
  );

  assert.equal(
    out,
    ["void solve() {", "    int n, k;", "    cout << n + k << endl;", "}"].join("\n")
  );
});

test("balanced delimiters everywhere after every repair", () => {
  const file = [
    "void f(int a) {",
    "    if (a) {",
    "        for (int i = 0; i < 3; i++) {",
    "            int arr[2] = {0, 1};",
    "            work(arr[0]);",
    "        }",
    "    }",
    "}",
  ].join("\n");
  const edits: AIEdit[] = [
    { startLine: 6, startColumn: 1, endLine: 7, endColumn: 1, newText: "    more();\n" },
  ];
  const safe = sanitizeStructuralEdits(file, edits);
  const normalized = normalizeEditIndentation(file, safe);
  const result = applyEditsToText(file, normalized);
  const balance = validateStructuralBalance(file, normalized);
  assert.equal(balance.valid, true, JSON.stringify(balance.unbalanced));
  for (const c of ["{", "}", "(", ")", "[", "]"]) {
    assert.ok(result.includes(c), `result still contains ${c}`);
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Direct unit checks for the repair primitives.
// ──────────────────────────────────────────────────────────────────────────
test("repairDeletedDelimiters turns a brace-replacing edit into an insertion", () => {
  const file = ["void f() {", "    x();", "}"].join("\n");
  const edit: AIEdit = {
    startLine: 3,
    startColumn: 1,
    endLine: 4,
    endColumn: 1,
    newText: "    y();\n",
  };
  const repaired = repairDeletedDelimiters(file, edit);
  assert.equal(repaired.startLine, 3);
  assert.equal(repaired.endLine, 3);
  assert.equal(repaired.endColumn, 1);
  assert.equal(applyEditsToText(file, [repaired]), "void f() {\n    x();\n    y();\n}");
});

test("repairDeletedDelimiters leaves balanced deletion untouched", () => {
  const file = "int a = f({1, 2});\n";
  // Removing a fully balanced `{1, 2}` block is fine — no closer is orphaned.
  const edit: AIEdit = {
    startLine: 1,
    startColumn: 9,
    endLine: 1,
    endColumn: 15,
    newText: "",
  };
  const repaired = repairDeletedDelimiters(file, edit);
  assert.equal(repaired.endLine, 1);
  assert.equal(repaired.endColumn, 15);
});

test("snapInsertionBeforeLastCloser moves end-of-file insertions before }", () => {
  const file = ["void solve() {", "    int n;", "}"].join("\n");
  const style = inferIndentStyle(file);
  const structure = analyzeStructure(file, style);
  const edit: AIEdit = {
    startLine: 3,
    startColumn: 2, // insertion at "end of file"
    endLine: 3,
    endColumn: 2,
    newText: "    cout << n;\n",
  };
  const snapped = snapInsertionBeforeLastCloser(file, edit, structure.closes);
  assert.equal(snapped.startLine, 3);
  assert.equal(snapped.startColumn, 1);
});

test("validateStructuralBalance rejects an edit that would delete a brace", () => {
  const file = "void f() {\n    x();\n}\n";
  const bad: AIEdit = {
    startLine: 3,
    startColumn: 1,
    endLine: 4,
    endColumn: 1,
    newText: "",
  };
  assert.equal(validateStructuralBalance(file, [bad]).valid, false);
});

console.log(`\n${passed} structural-edit regression tests passed.`);
