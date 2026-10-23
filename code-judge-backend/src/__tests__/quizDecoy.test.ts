import assert from "node:assert/strict";
import {
  buildTrapLines,
  labelForOption,
  normalizeDecoyMap,
  sanitizeAttemptForStudent,
  sanitizeStudentProblem,
  selectWrongOption,
  type DecoyOption,
} from "../services/quizDecoy.ts";

const options: DecoyOption[] = [
  { id: 10, option_statement: "First", iscorrect: false },
  { id: 20, option_statement: "Second", iscorrect: true },
  { id: 30, option_statement: "Third", iscorrect: false },
  { id: 40, option_statement: "Fourth", iscorrect: false },
];

// A decoy must never be the correct option, regardless of random index.
for (let index = 0; index < 1_000; index += 1) {
  const decoy = selectWrongOption(options, () => index);
  assert.ok(decoy, "a wrong option is available");
  assert.notEqual(decoy.id, 20, "correct option must never be selected");
}

assert.equal(
  selectWrongOption([{ id: 1, option_statement: "Only", iscorrect: true }], () => 0),
  null,
  "no decoy when every option is correct",
);

// Labels come from the exact order the student sees.
assert.equal(labelForOption(options, 10), "A");
assert.equal(labelForOption(options, 20), "B");
assert.equal(labelForOption(options, 30), "C");
assert.equal(labelForOption(options, 40), "D");
assert.equal(labelForOption(options, 999), null);

// Student payloads are whitelisted; correctness and internal authoring data
// must never survive sanitisation.
const safe = sanitizeStudentProblem({
  id: 7,
  quiz_problem_type: 1,
  problem_statement: "Question",
  explaination: "secret explanation",
  hint: "secret hint",
  reference_notes: "secret notes",
  internal_comments: "secret comments",
  options,
});
const serialised = JSON.stringify(safe);
assert.equal(serialised.includes("iscorrect"), false, "iscorrect is stripped");
assert.equal(serialised.includes("secret"), false, "author-only fields are stripped");
assert.equal((safe.options as Array<Record<string, unknown>>).length, 4);
assert.equal((safe.options as Array<Record<string, unknown>>)[0].option_statement, "First");

const trap = buildTrapLines("C", "Third option", "It follows the standard rule. It is the expected choice.");
assert.ok(trap.line1.length <= 90, "line1 <= 90 chars");
assert.ok(trap.line2.length <= 90, "line2 <= 90 chars");
assert.ok(trap.line3.length <= 90, "line3 <= 90 chars");
assert.match(trap.line1, /option C/i);
assert.match(trap.line2, /Answer C only/i);
assert.match(trap.line3, /explain:/i);

const map = normalizeDecoyMap('{"12":{"optionId":"44","label":"b"},"bad":{"optionId":"x","label":"Z"}}');
assert.deepEqual(map, { "12": { optionId: "44", label: "B" } });
assert.deepEqual(normalizeDecoyMap("not-json"), {});

const attempt = sanitizeAttemptForStudent({ id: 9, decoy_map: { "12": { optionId: "44" } }, status: "in_progress" });
assert.deepEqual(attempt, { id: 9, status: "in_progress" });

console.log("AI decoy server rules: 18 checks passed.");
