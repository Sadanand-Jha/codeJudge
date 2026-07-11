export interface SampleTest {
  input: string;
  output: string;
  explanation?: string | null;
}

/** Matches the backend ProblemDetail response */
export interface Problem {
  id: number;
  problem_id: string;
  title: string;
  statement: string;
  input_specification: string;
  output_specification: string;
  constraints: string | null;
  notes: string | null;
  time_limit: string;
  time_limit_ms: number;
  space_limit: string;
  memory_limit_mb: number;
  rating: number | null;
  source: string | null;
  contest_id: string | null;
  problem_index: string | null;
  tags: string[];
  sample_tests: SampleTest[];
}

/** Matches the backend ProblemListItem response */
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
}

/** API response wrapper from backend */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ProblemPageProps {
  params: Promise<{ problemId: string }>;
}