import assert from "node:assert/strict";
import { hashAnswerText, normalizeAnswerText } from "../utils/answerHash.ts";

assert.equal(normalizeAnswerText("  New   Delhi "), "new delhi");
assert.equal(normalizeAnswerText("2 + 2"), "2 + 2");
assert.equal(normalizeAnswerText(""), "");

const spaced = await hashAnswerText("  New   Delhi ");
const canonical = await hashAnswerText("new delhi");
assert.equal(spaced, canonical, "normalization must make whitespace/case irrelevant");
assert.match(spaced, /^[a-f0-9]{64}$/);
assert.notEqual(await hashAnswerText("new delhi"), await hashAnswerText("newdelhi"));
assert.equal(await hashAnswerText(""), await hashAnswerText("   "));

console.log("answerHash tests passed");
