// ============================================
// Problem Types
// ============================================

/** Lightweight problem info for the problem list page */
export interface ProblemListItem {
  id: number;
  problem_id: string;
  title: string;
  rating: number | null;
  time_limit: string;
  time_limit_ms: number;
  space_limit: string;
  memory_limit_mb: number;
  tags: string[];
  source: string | null;
  contest_id: string | null;
  problem_index: string | null;
  created_at: Date;
  updated_at: Date;
}

/** A single sample testcase */
export interface SampleTestcase {
  input: string;
  output: string;
  explanation: string | null;
}

/** Full problem detail for the single problem view */
export interface ProblemDetail {
  id: number;
  problem_id: string;
  title: string;
  rating: number | null;
  time_limit: string;
  time_limit_ms: number;
  space_limit: string;
  memory_limit_mb: number;
  statement: string;
  input_specification: string;
  output_specification: string;
  constraints: string | null;
  notes: string | null;
  source: string | null;
  contest_id: string | null;
  problem_index: string | null;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  sample_tests: SampleTestcase[];
}

/** Raw database row returned from a query that joins problems + tags */
export interface ProblemTagRow {
  id: number;
  problem_id: string;
  title: string;
  rating: number | null;
  time_limit_ms: number;
  memory_limit_mb: number;
  contest_id: string | null;
  problem_index: string | null;
  source: string | null;
  created_at: Date;
  updated_at: Date;
  tags: string[] | null;
}

/** Raw database row for a full problem with sample testcases */
export interface ProblemDetailRow {
  id: number;
  problem_id: string;
  title: string;
  rating: number | null;
  time_limit_ms: number;
  memory_limit_mb: number;
  statement: string;
  input_specification: string;
  output_specification: string;
  constraints: string | null;
  notes: string | null;
  source: string | null;
  contest_id: string | null;
  problem_index: string | null;
  created_at: Date;
  updated_at: Date;
  tags: string[] | null;
  sample_testcases: string | null;
}

// ============================================
// API Response Types
// ============================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// Error Types
// ============================================

export class NotFoundError extends Error {
  public statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}