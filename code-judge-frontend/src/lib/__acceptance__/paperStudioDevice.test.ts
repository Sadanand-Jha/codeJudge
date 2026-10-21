import assert from "node:assert/strict";
import { shouldOpenPaperStudioOnDesktop } from "../documentEditor/device";

const base = {
  viewportWidth: 1440,
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
  maxTouchPoints: 0,
  coarsePointer: false,
};

assert.equal(shouldOpenPaperStudioOnDesktop(base), true, "desktop browsers open the editor");
assert.equal(
  shouldOpenPaperStudioOnDesktop({ ...base, viewportWidth: 390, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148" }),
  false,
  "phones are blocked"
);
assert.equal(
  shouldOpenPaperStudioOnDesktop({ ...base, viewportWidth: 1024, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18 Safari/605.1.15", maxTouchPoints: 5, coarsePointer: true }),
  false,
  "touch tablets are blocked even in landscape"
);
assert.equal(shouldOpenPaperStudioOnDesktop({ ...base, viewportWidth: 900 }), false, "narrow desktop windows are blocked");
assert.equal(
  shouldOpenPaperStudioOnDesktop({ ...base, maxTouchPoints: 10, coarsePointer: false }),
  true,
  "touchscreen laptops with a fine primary pointer still open"
);

console.log("Paper Studio device gate: 5 checks passed.");
