"use strict";
/**
 * ================================================================
 * Codeforces Problem Scraper
 * ================================================================
 *
 * This scraper fetches problem statements from Codeforces and preserves
 * all formatting including:
 * - Paragraph breaks
 * - Empty lines between sections
 * - Bullet lists
 * - Numbered lists
 * - Indentation
 * - Mathematical expressions
 * - Code blocks
 * - Multiple consecutive newlines
 *
 * The scraper stores the HTML content as-is in the database.
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
exports.scrapeCodeforcesProblem = scrapeCodeforcesProblem;
exports.extractSampleTests = extractSampleTests;
exports.scrapeContestProblems = scrapeContestProblems;
var axios_1 = require("axios");
var cheerio = require("cheerio");
/**
 * Fetches a problem from Codeforces and returns structured data.
 * Preserves all HTML formatting in the statement.
 */
function scrapeCodeforcesProblem(contestId, problemIndex) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, $, statementElement, title, limitsText, timeLimitMatch, timeLimit, memoryMatch, memoryLimit, statement, inputSpecification, outputSpecification, notes, sampleTests, tags;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "https://codeforces.com/contest/".concat(contestId, "/problem/").concat(problemIndex);
                    return [4 /*yield*/, axios_1.default.get(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (compatible; CodeJudge/1.0)",
                            },
                        })];
                case 1:
                    response = _a.sent();
                    $ = cheerio.load(response.data);
                    statementElement = $(".problem-statement").first();
                    title = statementElement.find(".header .title").text().trim();
                    limitsText = statementElement.find(".header .time-limit").text();
                    timeLimitMatch = limitsText.match(/(\d+)\s*ms/);
                    timeLimit = timeLimitMatch ? parseInt(timeLimitMatch[1]) : 2000;
                    memoryMatch = limitsText.match(/(\d+)\s*MB/);
                    memoryLimit = memoryMatch ? parseInt(memoryMatch[1]) : 256;
                    statement = extractStatement($, statementElement);
                    inputSpecification = extractSectionContent($, statementElement, "input");
                    outputSpecification = extractSectionContent($, statementElement, "output");
                    notes = extractSectionContent($, statementElement, "note");
                    sampleTests = extractSampleTests($, statementElement);
                    tags = extractTags($);
                    return [2 /*return*/, {
                            problemId: "".concat(contestId).concat(problemIndex),
                            contestId: contestId,
                            problemIndex: problemIndex,
                            title: title,
                            statement: statement,
                            inputSpecification: inputSpecification,
                            outputSpecification: outputSpecification,
                            constraints: null,
                            notes: notes || null,
                            sampleTests: sampleTests,
                            timeLimit: timeLimit,
                            memoryLimit: memoryLimit,
                            rating: null,
                            tags: tags,
                        }];
            }
        });
    });
}
/**
 * Extracts the problem statement HTML.
 * The statement is the child div of .problem-statement that comes right after .header
 * and has no specific class (plain div).
 */
function extractStatement($, container) {
    var children = container.children();
    var statementHtml = "";
    children.each(function (_i, el) {
        var $el = $(el);
        var tagName = ($el.prop("tagName") || "").toLowerCase();
        if (tagName !== "div") {
            return;
        }
        var cls = $el.attr("class") || "";
        if (cls.includes("header")) {
            return;
        }
        if (!cls.includes("input") && !cls.includes("output") && !cls.includes("sample") && !cls.includes("note")) {
            statementHtml = $el.html() || "";
            return false;
        }
    });
    return statementHtml;
}
/**
 * Extracts content from a specific section of the problem statement.
 * Preserves all HTML formatting including paragraphs, lists, and code blocks.
 */
function extractSectionContent($, container, sectionType) {
    var selector = "";
    switch (sectionType) {
        case "input":
            selector = ".input-specification";
            break;
        case "output":
            selector = ".output-specification";
            break;
        case "note":
            selector = ".note";
            break;
    }
    var section = container.find(selector);
    if (section.length === 0) {
        return "";
    }
    return section.html() || "";
}
/**
 * Extracts sample test cases from the problem statement.
 *
 * Codeforces wraps sample test input/output inside <div class="test-example-line"> elements
 * (not inside <pre>). We need to:
 * 1. Find each .sample-test block
 * 2. For input: find all .test-example-line divs inside .input pre
 * 3. Extract only textContent from each line, join with '\n'
 * 4. Same for output
 * 5. If no .test-example-line divs found, fall back to getting the text directly from <pre>
 */
function extractSampleTests($, container) {
    var tests = [];
    container.find(".sample-test").each(function (_index, testEl) {
        // Extract input - prefer .test-example-line divs, fallback to <pre> text
        var input = extractTestLines($, $(testEl).find(".input pre"));
        var output = extractTestLines($, $(testEl).find(".output pre"));
        // Explanation is optional and we keep its HTML as-is (it may contain formatting)
        var explanation = null;
        var explanationEl = $(testEl).find(".explanation");
        if (explanationEl.length > 0) {
            explanation = explanationEl.html() || null;
        }
        tests.push({ input: input, output: output, explanation: explanation });
    });
    return tests;
}
/**
 * Extracts test case lines from a <pre> element.
 *
 * Codeforces can format sample test data in two ways:
 * 1. New style: <div class="test-example-line"> per line — extract text from each, join with \n
 * 2. Old style: plain text inside <pre> — use textContent directly
 */
function extractTestLines($, preElement) {
    if (preElement.length === 0) {
        return "";
    }
    // Check if there are .test-example-line divs inside
    var exampleLines = preElement.find("div.test-example-line");
    if (exampleLines.length > 0) {
        // New style: extract text from each .test-example-line and join with \n
        var lines_1 = [];
        exampleLines.each(function (_i, lineEl) {
            var line = $(lineEl).text();
            lines_1.push(line);
        });
        return lines_1.join("\n");
    }
    // Old style: grab the text directly from <pre>
    return preElement.text();
}
/**
 * Extracts tags from the page.
 */
function extractTags($) {
    var tags = [];
    var tagSelectors = [
        ".tag-box a",
        ".problem-tags a",
        ".tags a",
        ".sidebar .tag-box a",
    ];
    for (var _a = 0, tagSelectors_1 = tagSelectors; _a < tagSelectors_1.length; _a++) {
        var selector = tagSelectors_1[_a];
        $(selector).each(function (_i, el) {
            var tagText = $(el).text().trim();
            if (tagText && tagText !== '*' && !tags.includes(tagText)) {
                tags.push(tagText);
            }
        });
        if (tags.length > 0)
            break;
    }
    if (tags.length === 0) {
        $(".roundbox").each(function (_i, box) {
            var boxText = $(box).text();
            if (boxText.includes("Tags")) {
                $(box).find("a").each(function (_j, a) {
                    var tagText = $(a).text().trim();
                    if (tagText && tagText !== '*' && !tags.includes(tagText)) {
                        tags.push(tagText);
                    }
                });
            }
        });
    }
    return tags;
}
/**
 * Scrapes multiple problems from a contest.
 */
function scrapeContestProblems(contestId) {
    return __awaiter(this, void 0, void 0, function () {
        var problems, problemIndices, _a, problemIndices_1, index, problem, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    problems = [];
                    problemIndices = ["A", "B", "C", "D", "E", "F", "G"];
                    _a = 0, problemIndices_1 = problemIndices;
                    _b.label = 1;
                case 1:
                    if (!(_a < problemIndices_1.length)) return [3 /*break*/, 6];
                    index = problemIndices_1[_a];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, scrapeCodeforcesProblem(contestId, index)];
                case 3:
                    problem = _b.sent();
                    problems.push(problem);
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    _a++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, problems];
            }
        });
    });
}
