import assert from "node:assert/strict";
import { exceedsStorageLimit } from "../services/storageQuota.service.ts";

const MB = 1024 * 1024;

assert.equal(exceedsStorageLimit(0, 0, 200), false);
assert.equal(exceedsStorageLimit(199 * MB, MB, 200), false);
assert.equal(exceedsStorageLimit(200 * MB, 1, 200), true);
assert.equal(exceedsStorageLimit(201 * MB, 0, 200), true);
assert.equal(exceedsStorageLimit(10_000 * MB, 50 * MB, -1), false);

console.log("Storage quota checks passed.");
