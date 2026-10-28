import assert from "node:assert/strict";
import {
  SecureSaveCancelledError,
  formatKeyHex,
  generateKeyHex,
  isSecureSaveCancelledError,
  normalizeKeyHex,
  prepareQuiz,
  unlockQuiz,
} from "../quizCrypto";

const questions = [
  {
    id: "q1",
    type: "single_choice",
    title: "<p>What is <strong>2 + 2</strong>?</p>",
    problemHtml: "<p>What is <strong>2 + 2</strong>?</p>",
    options: [
      { id: "a", label: "A", content: "3", isCorrect: false },
      { id: "b", label: "B", content: "4", isCorrect: true },
    ],
    correctAnswer: "b",
    marks: 10,
    difficulty: "Easy",
  },
  {
    id: "q2",
    type: "match_following",
    title: "<p>Match the SQL operations.</p>",
    problemHtml: "<p>Match the SQL operations.</p>",
    matchItems: [{ id: "l1", content: "SELECT" }],
    matchMatches: [{ id: "r1", content: "Read rows" }],
    matchMapping: { l1: "r1" },
    marks: 5,
    difficulty: "Medium",
  },
];

async function main() {
  assert.match(generateKeyHex(), /^[0-9a-f]{64}$/);

  const prepared = await prepareQuiz(
    { questions, title: "Encryption acceptance" },
    { quizId: "42", now: new Date("2026-01-01T00:00:00.000Z") }
  );

  assert.equal(prepared.keyHex.length, 64);
  assert.match(prepared.keyHex, /^[0-9a-f]{64}$/);
  assert.equal(prepared.payload.quizId, "42");
  assert.equal(prepared.payload.version, 1);
  assert.equal(prepared.payload.algorithm, "AES-256-GCM");
  assert.equal(prepared.payload.keyFingerprint, prepared.keyFingerprint);
  assert.match(prepared.keyFingerprint, /^[0-9a-f]{64}$/);

  const serializedPayload = JSON.stringify(prepared.payload);
  assert.equal(serializedPayload.includes("2 + 2"), false);
  assert.equal(serializedPayload.includes("SELECT"), false);
  assert.equal(serializedPayload.includes("<p>"), false);
  assert.equal(serializedPayload.includes(prepared.keyHex), false);

  const formatted = formatKeyHex(prepared.keyHex);
  assert.equal(normalizeKeyHex(formatted), prepared.keyHex);
  assert.equal(normalizeKeyHex(prepared.keyHex.toUpperCase()), prepared.keyHex);

  const unlocked = await unlockQuiz(prepared.payload, formatted);
  assert.deepEqual(unlocked.questions, questions);
  assert.equal(unlocked.problemHtml.q1, questions[0].problemHtml);
  assert.equal(unlocked.problemHtml.q2, questions[1].problemHtml);
  assert.equal(unlocked.title, "Encryption acceptance");
  assert.equal(unlocked.keyFingerprint, prepared.keyFingerprint);

  await assert.rejects(
    () => unlockQuiz(prepared.payload, generateKeyHex()),
    /Could not unlock/
  );

  await assert.rejects(
    () => unlockQuiz({ ...prepared.payload, quizId: "43" }, prepared.keyHex),
    /Could not unlock/
  );

  assert.throws(() => normalizeKeyHex("deadbeef"), /64 hexadecimal/);
  assert.throws(
    () => normalizeKeyHex(`${prepared.keyHex.slice(0, 63)}g`),
    /64 hexadecimal/
  );

  const reused = await prepareQuiz(
    { questions: [questions[0]], title: "Reused key" },
    { quizId: "42", keyHex: prepared.keyHex }
  );
  assert.equal(reused.keyHex, prepared.keyHex);
  assert.equal(reused.keyFingerprint, prepared.keyFingerprint);
  const reopened = await unlockQuiz(reused.payload, prepared.keyHex);
  assert.deepEqual(reopened.questions, [questions[0]]);

  const overridden = await prepareQuiz(
    {
      questions: [questions[0]],
      problemHtml: { q1: "<p>Encrypted override only</p>" },
    },
    { quizId: "override" }
  );
  const overriddenUnlocked = await unlockQuiz(
    overridden.payload,
    overridden.keyHex
  );
  assert.equal(
    overriddenUnlocked.problemHtml.q1,
    "<p>Encrypted override only</p>"
  );

  assert.equal(
    isSecureSaveCancelledError(new SecureSaveCancelledError()),
    true
  );
  assert.equal(isSecureSaveCancelledError(new Error("nope")), false);

  console.log("quizCrypto acceptance: ok");
}

void main();
