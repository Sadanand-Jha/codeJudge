"use strict";
/**
 * ================================================================
 * Problem Repository (Data Access Layer)
 * ================================================================
 *
 * FLOW:
 *   Service → Repository → PostgreSQL
 *
 * This is the ONLY layer that touches the database.
 * It uses the pool exported from app.ts (Pool from 'pg').
 *
 * getAllProblems():
 *   ┌─ SQL ────────────────────────────────────────────────────┐
 *   │ SELECT p.id, p.problem_id, p.title, p.rating,           │
 *   │        p.time_limit_ms, p.memory_limit_mb,               │
 *   │        p.source, p.contest_id, p.problem_index,          │
 *   │        COALESCE(json_agg(t.name), '[]'::json) AS tags   │
 *   │ FROM problems p                                          │
 *   │ LEFT JOIN problem_tags pt ON pt.problem_id = p.id        │
 *   │ LEFT JOIN tags t ON t.id = pt.tag_id                     │
 *   │ GROUP BY p.id                                            │
 *   │ ORDER BY p.id ASC                                        │
 *   └──────────────────────────────────────────────────────────┘
 *   → result.rows
 *   → mapRowToListItem() for each row
 *   → Returns ProblemListItem[] (lightweight, no statement/sample_tests)
 *
 * getProblemByProblemId(problemId):
 *   ┌─ SQL ────────────────────────────────────────────────────┐
 *   │ SELECT p.id, p.problem_id, p.title, p.rating,           │
 *   │        p.time_limit_ms, p.memory_limit_mb,               │
 *   │        p.statement, p.input_specification,               │
 *   │        p.output_specification, p.constraints, p.notes,   │
 *   │        p.source, p.contest_id, p.problem_index,          │
 *   │        COALESCE(json_agg(DISTINCT t.name), '[]')         │
 *   │          AS tags_raw,                                    │
 *   │        COALESCE(json_agg(DISTINCT sample_testcases),     │
 *   │          '[]'::json) AS sample_testcases                 │
 *   │ FROM problems p                                          │
 *   │ LEFT JOIN problem_tags ON ...                            │
 *   │ LEFT JOIN sample_testcases ON ...                        │
 *   │ WHERE p.problem_id = $1                                  │
 *   │ GROUP BY p.id                                            │
 *   └──────────────────────────────────────────────────────────┘
 *   → result.rows[0] or null
 *   → If found: build ProblemDetailRow → mapRowToDetail() → ProblemDetail
 *   → If not found: return null (service layer throws NotFoundError)
 *
 * FIELD MAPPING (DB → API):
 *   DB Column           → API Field            → Frontend Uses
 *   ───────────────────────────────────────────────────────────
 *   problem_id          → problem_id           → ID, URL param
 *   title               → title                → Display title
 *   statement           → statement            → SafeHTML (dangerouslySetInnerHTML)
 *   input_specification → input_specification  → SafeHTML
 *   output_specification→ output_specification → SafeHTML
 *   constraints         → constraints          → SafeHTML (optional)
 *   notes               → notes                → SafeHTML (optional)
 *   time_limit_ms       → time_limit_ms        → ProblemInfoCard.formatTime()
 *   memory_limit_mb     → memory_limit_mb      → ProblemInfoCard.formatMemory()
 *   -                   → time_limit (computed)→ "1000 ms"
 *   -                   → space_limit (computed)→ "256 MB"
 *   source              → source               → Badge display
 *   contest_id (int)    → contest_id (string)  → "4A — Title" format
 *   problem_index       → problem_index        → "4A — Title" format
 *   tags (via JOIN)     → tags (string[])      → TagBadge components
 *   sample_testcases    → sample_tests         → SampleTestCard
 *
 * ================================================================
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.ProblemRepository = void 0;
var app_ts_1 = require("../app.ts");
/**
 * Converts raw DB columns to the API-facing lightweight problem list format.
 */
function mapRowToListItem(row) {
    var _a, _b, _c, _d;
    return {
        id: row.id,
        problem_id: row.problem_id,
        title: row.title,
        rating: (_a = row.rating) !== null && _a !== void 0 ? _a : null,
        time_limit: "".concat(row.time_limit_ms, " ms"),
        time_limit_ms: row.time_limit_ms,
        space_limit: "".concat(row.memory_limit_mb, " MB"),
        memory_limit_mb: row.memory_limit_mb,
        tags: (_b = row.tags) !== null && _b !== void 0 ? _b : [],
        source: (_c = row.source) !== null && _c !== void 0 ? _c : null,
        contest_id: row.contest_id ? String(row.contest_id) : null,
        problem_index: (_d = row.problem_index) !== null && _d !== void 0 ? _d : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
/**
 * Converts a raw detail row (with JSON-encoded sample testcases) to the API format.
 */
function mapRowToDetail(row) {
    var _a, _b, _c, _d, _e, _f;
    // Parse the JSON-encoded sample testcases string
    var sampleTests = [];
    if (row.sample_testcases) {
        try {
            sampleTests = JSON.parse(row.sample_testcases);
        }
        catch (_g) {
            // If parsing fails, default to empty array
            sampleTests = [];
        }
    }
    return {
        id: row.id,
        problem_id: row.problem_id,
        title: row.title,
        rating: (_a = row.rating) !== null && _a !== void 0 ? _a : null,
        time_limit: "".concat(row.time_limit_ms, " ms"),
        time_limit_ms: row.time_limit_ms,
        space_limit: "".concat(row.memory_limit_mb, " MB"),
        memory_limit_mb: row.memory_limit_mb,
        statement: row.statement,
        input_specification: row.input_specification,
        output_specification: row.output_specification,
        constraints: (_b = row.constraints) !== null && _b !== void 0 ? _b : null,
        notes: (_c = row.notes) !== null && _c !== void 0 ? _c : null,
        source: (_d = row.source) !== null && _d !== void 0 ? _d : null,
        contest_id: row.contest_id ? String(row.contest_id) : null,
        problem_index: (_e = row.problem_index) !== null && _e !== void 0 ? _e : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags: (_f = row.tags) !== null && _f !== void 0 ? _f : [],
        sample_tests: sampleTests,
    };
}
var ProblemRepository = /** @class */ (function () {
    function ProblemRepository() {
    }
    /**
     * Fetches all problems with their associated tags.
     * Uses a LEFT JOIN and array_agg to avoid N+1 queries.
     */
    ProblemRepository.prototype.getAllProblems = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n      SELECT\n        p.id,\n        p.problem_id,\n        p.title,\n        p.rating,\n        p.time_limit_ms,\n        p.memory_limit_mb,\n        p.source,\n        p.contest_id,\n        p.problem_index,\n        p.created_at,\n        p.updated_at,\n        COALESCE(\n          json_agg(t.name) FILTER (WHERE t.name IS NOT NULL),\n          '[]'::json\n        ) AS tags\n      FROM problems p\n      LEFT JOIN problem_tags pt ON pt.problem_id = p.id\n      LEFT JOIN tags t ON t.id = pt.tag_id\n      GROUP BY p.id\n      ORDER BY p.id ASC\n    ";
                        return [4 /*yield*/, app_ts_1.pool.query(query)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.rows.map(function (row) { return (__assign(__assign({}, mapRowToListItem(row)), { tags: row.tags })); })];
                }
            });
        });
    };
    /**
     * Fetches a single problem by its problem_id string (e.g. "2242B")
     * including tags and sample testcases.
     */
    ProblemRepository.prototype.getProblemByProblemId = function (problemId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result, row, tags, detailRow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n       SELECT\n         p.id,\n         p.problem_id,\n         p.title,\n         p.rating,\n         p.time_limit_ms,\n         p.memory_limit_mb,\n         p.statement,\n         p.input_specification,\n         p.output_specification,\n         p.constraints,\n         p.notes,\n         p.source,\n         p.contest_id,\n         p.problem_index,\n         p.created_at,\n         p.updated_at,\n         COALESCE(\n           json_agg(DISTINCT jsonb_build_object('name', t.name)) FILTER (WHERE t.name IS NOT NULL),\n           '[]'::json\n         ) AS tags_raw,\n         COALESCE(\n           json_agg(\n             jsonb_build_object(\n               'input', st.input,\n               'output', st.output,\n               'explanation', st.explanation\n             )\n           ) FILTER (WHERE st.id IS NOT NULL),\n           '[]'::json\n         ) AS sample_testcases\n       FROM problems p\n       LEFT JOIN problem_tags pt ON pt.problem_id = p.id\n       LEFT JOIN tags t ON t.id = pt.tag_id\n       LEFT JOIN sample_testcases st ON st.problem_id = p.id\n       WHERE p.problem_id = $1\n       GROUP BY p.id\n     ";
                        return [4 /*yield*/, app_ts_1.pool.query(query, [problemId])];
                    case 1:
                        result = _a.sent();
                        if (result.rows.length === 0) {
                            return [2 /*return*/, null];
                        }
                        row = result.rows[0];
                        tags = Array.isArray(row.tags_raw)
                            ? row.tags_raw.map(function (t) { return t.name; })
                            : [];
                        detailRow = {
                            id: row.id,
                            problem_id: row.problem_id,
                            title: row.title,
                            rating: row.rating,
                            time_limit_ms: row.time_limit_ms,
                            memory_limit_mb: row.memory_limit_mb,
                            statement: row.statement,
                            input_specification: row.input_specification,
                            output_specification: row.output_specification,
                            constraints: row.constraints,
                            notes: row.notes,
                            source: row.source,
                            contest_id: row.contest_id,
                            problem_index: row.problem_index,
                            created_at: row.created_at,
                            updated_at: row.updated_at,
                            tags: tags,
                            sample_testcases: JSON.stringify(Array.isArray(row.sample_testcases) ? row.sample_testcases : []),
                        };
                        return [2 /*return*/, mapRowToDetail(detailRow)];
                }
            });
        });
    };
    return ProblemRepository;
}());
exports.ProblemRepository = ProblemRepository;
