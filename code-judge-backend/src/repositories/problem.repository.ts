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

import { pool } from "../app.ts";
import type { ProblemListItem, ProblemDetail, ProblemDetailRow, SampleTestcase } from "../types/index.ts";

/**
 * Converts raw DB columns to the API-facing lightweight problem list format.
 */
function mapRowToListItem(row: any): ProblemListItem {
  return {
    id: row.id,
    problem_id: row.problem_id,
    title: row.title,
    rating: row.rating ?? null,
    time_limit: `${row.time_limit_ms} ms`,
    time_limit_ms: row.time_limit_ms,
    space_limit: `${row.memory_limit_mb} MB`,
    memory_limit_mb: row.memory_limit_mb,
    tags: row.tags ?? [],
    source: row.source ?? null,
    contest_id: row.contest_id ? String(row.contest_id) : null,
    problem_index: row.problem_index ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Converts a raw detail row (with JSON-encoded sample testcases) to the API format.
 */
function mapRowToDetail(row: ProblemDetailRow): ProblemDetail {
  // Parse the JSON-encoded sample testcases string
  let sampleTests: SampleTestcase[] = [];
  if (row.sample_testcases) {
    try {
      sampleTests = JSON.parse(row.sample_testcases);
    } catch {
      // If parsing fails, default to empty array
      sampleTests = [];
    }
  }

  return {
    id: row.id,
    problem_id: row.problem_id,
    title: row.title,
    rating: row.rating ?? null,
    time_limit: `${row.time_limit_ms} ms`,
    time_limit_ms: row.time_limit_ms,
    space_limit: `${row.memory_limit_mb} MB`,
    memory_limit_mb: row.memory_limit_mb,
    statement: row.statement,
    input_specification: row.input_specification,
    output_specification: row.output_specification,
    constraints: row.constraints ?? null,
    notes: row.notes ?? null,
    source: row.source ?? null,
    contest_id: row.contest_id ? String(row.contest_id) : null,
    problem_index: row.problem_index ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: row.tags ?? [],
    sample_tests: sampleTests,
  };
}

export class ProblemRepository {
  /**
   * Fetches all problems with their associated tags.
   * Uses a LEFT JOIN and array_agg to avoid N+1 queries.
   */
  async getAllProblems(): Promise<ProblemListItem[]> {
    const query = `
      SELECT
        p.id,
        p.problem_id,
        p.title,
        p.rating,
        p.time_limit_ms,
        p.memory_limit_mb,
        p.source,
        p.contest_id,
        p.problem_index,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(t.name) FILTER (WHERE t.name IS NOT NULL),
          '[]'::json
        ) AS tags
      FROM problems p
      LEFT JOIN problem_tags pt ON pt.problem_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
      GROUP BY p.id
      ORDER BY p.id ASC
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      ...mapRowToListItem(row),
      tags: row.tags, // already a parsed JSON array from pg
    }));
  }

  /**
   * Fetches a single problem by its problem_id string (e.g. "2242B")
   * including tags and sample testcases.
   */
  async getProblemByProblemId(problemId: string): Promise<ProblemDetail | null> {
    const query = `
      SELECT
        p.id,
        p.problem_id,
        p.title,
        p.rating,
        p.time_limit_ms,
        p.memory_limit_mb,
        p.statement,
        p.input_specification,
        p.output_specification,
        p.constraints,
        p.notes,
        p.source,
        p.contest_id,
        p.problem_index,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('name', t.name)) FILTER (WHERE t.name IS NOT NULL),
          '[]'::json
        ) AS tags_raw,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'input', st.input,
              'output', st.output,
              'explanation', st.explanation
            )
            ORDER BY st.testcase_order
          ) FILTER (WHERE st.id IS NOT NULL),
          '[]'::json
        ) AS sample_testcases
      FROM problems p
      LEFT JOIN problem_tags pt ON pt.problem_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
      LEFT JOIN sample_testcases st ON st.problem_id = p.id
      WHERE p.problem_id = $1
      GROUP BY p.id
    `;

    const result = await pool.query(query, [problemId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Extract just the tag names from the tags_raw JSON array
    const tags: string[] = Array.isArray(row.tags_raw)
      ? row.tags_raw.map((t: any) => t.name)
      : [];

    // Build the detail object
    const detailRow: ProblemDetailRow = {
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
      sample_testcases: JSON.stringify(
        Array.isArray(row.sample_testcases) ? row.sample_testcases : []
      ),
    };

    return mapRowToDetail(detailRow);
  }
}