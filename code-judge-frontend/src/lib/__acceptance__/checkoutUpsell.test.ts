/**
 * Checkout-upsell acceptance checks:
 *  - plan/pack deep links survive auth without becoming open redirects;
 *  - both checkout dialogs render server-driven suggestions;
 *  - public pricing pages use the suggestion-aware CTAs.
 *
 * Run: npx tsx src/lib/__acceptance__/checkoutUpsell.test.ts
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { safeNextPath } from "../safeNext";

assert.equal(
  safeNextPath("/creator/billing/plans?plan=pro"),
  "/creator/billing/plans?plan=pro"
);
assert.equal(
  safeNextPath("/creator/billing/credits?pack=master"),
  "/creator/billing/credits?pack=master"
);
assert.equal(safeNextPath("//evil.example"), null);
assert.equal(safeNextPath("/\\evil.example"), null);
assert.equal(safeNextPath("/login?next=/creator"), null);
assert.equal(safeNextPath("https://evil.example"), null);
assert.equal(safeNextPath(null), null);

const root = join(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const planDialog = read("components/creator/billing/PlanCheckoutDialog.tsx");
assert.match(planDialog, /getCheckoutSuggestion/);
assert.match(planDialog, /suggestion_shown/);
assert.match(planDialog, /suggestion_accepted/);
assert.match(planDialog, /suggestion_declined/);

const packDialog = read("components/creator/billing/credits/OrderSummaryDialog.tsx");
assert.match(packDialog, /getCheckoutSuggestion/);
assert.match(packDialog, /onSwitchPack/);

const publicPricing = read("app/pricing/page.tsx");
assert.match(publicPricing, /PublicPlanCta/);
const publicCredits = read("app/pricing/credits/page.tsx");
assert.match(publicCredits, /PublicPackCta/);

console.log("checkoutUpsell.test.ts: all assertions passed");
