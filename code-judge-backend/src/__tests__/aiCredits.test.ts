import assert from "node:assert/strict";
import {
  TOKENS_PER_AI_CREDIT,
  creditsForTokens,
  creditsForUsage,
  totalTokensForUsage,
} from "../services/aiCredits.service.ts";

assert.equal(TOKENS_PER_AI_CREDIT, 1_000);

assert.equal(totalTokensForUsage(undefined), 0);
assert.equal(totalTokensForUsage({}), 0);
assert.equal(totalTokensForUsage({ totalTokens: 14_000 }), 14_000);
assert.equal(
  totalTokensForUsage({ inputTokens: 9_000, outputTokens: 5_000 }),
  14_000
);
assert.equal(
  totalTokensForUsage({
    inputTokens: 9_000,
    outputTokens: 5_000,
    totalTokens: 14_500,
  }),
  14_500
);
assert.equal(totalTokensForUsage({ inputTokens: -10, outputTokens: -5 }), 0);

assert.equal(creditsForTokens(0), 0);
assert.equal(creditsForTokens(-100), 0);
assert.equal(creditsForTokens(1), 1);
assert.equal(creditsForTokens(999), 1);
assert.equal(creditsForTokens(1_000), 1);
assert.equal(creditsForTokens(1_001), 2);
assert.equal(creditsForTokens(14_000), 14);

assert.equal(creditsForUsage({ totalTokens: 14_000 }), 14);
assert.equal(creditsForUsage({ inputTokens: 900, outputTokens: 700 }), 2);

// The requested example: a 20-credit balance pays for a 14k-token quiz and
// keeps 6 credits.
const openingBalance = 20;
const quizTokens = 14_000;
assert.equal(openingBalance - creditsForUsage({ totalTokens: quizTokens }), 6);

console.log("AI credits: 18 checks passed.");
