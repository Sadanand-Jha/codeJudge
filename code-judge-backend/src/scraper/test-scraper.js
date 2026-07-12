"use strict";
/**
 * ================================================================
 * Test Scraper - Contest 2227
 * ================================================================
 *
 * This script scrapes all problems from Codeforces contest 2227
 * and saves them to the database.
 *
 * Usage:
 *   npx tsx src/scraper/test-scraper.ts
 *
 * ================================================================
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var codeforcesScraper_ts_1 = require("./codeforcesScraper.ts");
var app_ts_1 = require("../app.ts");
var CONTEST_ID = "2227";
/**
 * Saves a problem to the database with its tags and sample testcases
 */
function saveProblemToDatabase(problem) {
    return __awaiter(this, void 0, void 0, function () {
        var client, problemQuery, problemResult, problemId, _i, _a, tagName, tagResult, tagId, existingTag, i, test, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, app_ts_1.pool.connect()];
                case 1:
                    client = _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 19, 21, 22]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 3:
                    _b.sent();
                    problemQuery = "\n      INSERT INTO problems (\n        problem_id, contest_id, problem_index, source, title,\n        statement, input_specification, output_specification,\n        constraints, notes, time_limit_ms, memory_limit_mb, rating\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)\n      ON CONFLICT (problem_id) \n      DO UPDATE SET\n        title = EXCLUDED.title,\n        statement = EXCLUDED.statement,\n        input_specification = EXCLUDED.input_specification,\n        output_specification = EXCLUDED.output_specification,\n        constraints = EXCLUDED.constraints,\n        notes = EXCLUDED.notes,\n        time_limit_ms = EXCLUDED.time_limit_ms,\n        memory_limit_mb = EXCLUDED.memory_limit_mb,\n        rating = EXCLUDED.rating,\n        updated_at = NOW()\n      RETURNING id\n    ";
                    return [4 /*yield*/, client.query(problemQuery, [
                            problem.problemId,
                            problem.contestId ? parseInt(problem.contestId) : null,
                            problem.problemIndex,
                            'Codeforces',
                            problem.title,
                            problem.statement,
                            problem.inputSpecification,
                            problem.outputSpecification,
                            problem.constraints,
                            problem.notes,
                            problem.timeLimit,
                            problem.memoryLimit,
                            problem.rating,
                        ])];
                case 4:
                    problemResult = _b.sent();
                    problemId = problemResult.rows[0].id;
                    console.log("  \u2713 Saved problem: ".concat(problem.problemId, " - ").concat(problem.title, " (DB ID: ").concat(problemId, ")"));
                    _i = 0, _a = problem.tags;
                    _b.label = 5;
                case 5:
                    if (!(_i < _a.length)) return [3 /*break*/, 12];
                    tagName = _a[_i];
                    return [4 /*yield*/, client.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id', [tagName])];
                case 6:
                    tagResult = _b.sent();
                    tagId = void 0;
                    if (!(tagResult.rows.length > 0)) return [3 /*break*/, 7];
                    tagId = tagResult.rows[0].id;
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, client.query('SELECT id FROM tags WHERE name = $1', [tagName])];
                case 8:
                    existingTag = _b.sent();
                    tagId = existingTag.rows[0].id;
                    _b.label = 9;
                case 9: 
                // Link tag to problem
                return [4 /*yield*/, client.query('INSERT INTO problem_tags (problem_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [problemId, tagId])];
                case 10:
                    // Link tag to problem
                    _b.sent();
                    _b.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 5];
                case 12:
                    console.log("  \u2713 Saved ".concat(problem.tags.length, " tags"));
                    // 3. Save sample testcases
                    // First, delete existing testcases for this problem (to handle updates)
                    return [4 /*yield*/, client.query('DELETE FROM sample_testcases WHERE problem_id = $1', [problemId])];
                case 13:
                    // 3. Save sample testcases
                    // First, delete existing testcases for this problem (to handle updates)
                    _b.sent();
                    i = 0;
                    _b.label = 14;
                case 14:
                    if (!(i < problem.sampleTests.length)) return [3 /*break*/, 17];
                    test = problem.sampleTests[i];
                    return [4 /*yield*/, client.query('INSERT INTO sample_testcases (problem_id, testcase_order, input, output, explanation) VALUES ($1, $2, $3, $4, $5)', [problemId, i + 1, test.input, test.output, test.explanation])];
                case 15:
                    _b.sent();
                    _b.label = 16;
                case 16:
                    i++;
                    return [3 /*break*/, 14];
                case 17:
                    console.log("  \u2713 Saved ".concat(problem.sampleTests.length, " sample testcases"));
                    return [4 /*yield*/, client.query('COMMIT')];
                case 18:
                    _b.sent();
                    return [3 /*break*/, 22];
                case 19:
                    error_1 = _b.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 20:
                    _b.sent();
                    throw error_1;
                case 21:
                    client.release();
                    return [7 /*endfinally*/];
                case 22: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main function to scrape contest 2227
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var problems, successCount, failCount, _i, problems_1, problem, error_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n\uD83D\uDE80 Starting scraper for Codeforces Contest ".concat(CONTEST_ID, "...\n"));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, 10, 12]);
                    // Scrape all problems from the contest
                    console.log("\uD83D\uDCE1 Fetching problems from Codeforces...");
                    return [4 /*yield*/, (0, codeforcesScraper_ts_1.scrapeContestProblems)(CONTEST_ID)];
                case 2:
                    problems = _a.sent();
                    console.log("\n\u2705 Found ".concat(problems.length, " problems\n"));
                    if (problems.length === 0) {
                        console.log("⚠️  No problems found. The contest might not exist or has no problems.");
                        return [2 /*return*/];
                    }
                    // Save each problem to the database
                    console.log("\uD83D\uDCBE Saving problems to database...\n");
                    successCount = 0;
                    failCount = 0;
                    _i = 0, problems_1 = problems;
                    _a.label = 3;
                case 3:
                    if (!(_i < problems_1.length)) return [3 /*break*/, 8];
                    problem = problems_1[_i];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, saveProblemToDatabase(problem)];
                case 5:
                    _a.sent();
                    successCount++;
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _a.sent();
                    console.error("  \u274C Failed to save problem ".concat(problem.problemId, ":"), error_2);
                    failCount++;
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    // Summary
                    console.log("\n".concat('='.repeat(50)));
                    console.log("\uD83D\uDCCA Scraping Summary:");
                    console.log("  Total problems found: ".concat(problems.length));
                    console.log("  Successfully saved:   ".concat(successCount));
                    console.log("  Failed:               ".concat(failCount));
                    console.log("".concat('='.repeat(50), "\n"));
                    if (successCount > 0) {
                        console.log("🎉 Scraping completed successfully!");
                        console.log("\nYou can now view the problems at: http://localhost:3000/api/problems");
                    }
                    return [3 /*break*/, 12];
                case 9:
                    error_3 = _a.sent();
                    console.error("\n❌ Fatal error during scraping:", error_3);
                    process.exit(1);
                    return [3 /*break*/, 12];
                case 10: 
                // Close the database pool
                return [4 /*yield*/, app_ts_1.pool.end()];
                case 11:
                    // Close the database pool
                    _a.sent();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
// Run the script
main();
