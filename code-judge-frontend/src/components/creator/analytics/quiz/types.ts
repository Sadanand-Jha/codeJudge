import type { Num } from "./utils";

export interface AnalyticsStats {
  total_attempts: Num;
  completed_attempts: Num;
  in_progress_attempts: Num;
  average_score: Num;
  median_score: Num;
  highest_score: Num;
  lowest_score: Num;
  stddev_score: Num;
  average_accuracy: Num;
  average_completion_time: Num;
  median_time: Num;
  fastest_time: Num;
  slowest_time: Num;
  completion_rate: Num;
  total_registrations: Num;
  passed_count: Num;
  pass_rate: Num;
}

export interface QuestionStat {
  id: number;
  question_number: number;
  problem_statement: string | null;
  problem_type: string | null;
  difficulty: number | null;
  difficulty_name: string | null;
  total_attempts: Num;
  total_responses: Num;
  correct_responses: Num;
  incorrect_responses: Num;
  skipped_count: Num;
  accuracy: Num;
  avg_time_ms: Num;
  median_time_ms?: Num;
  max_time_ms?: Num;
}

export interface ScatterPoint {
  x: Num;
  y: Num;
  percentage?: Num;
  username?: string | null;
  user_id?: number;
}

export interface FunnelRow {
  question_number: number;
  problem_statement?: string | null;
  reached: Num;
}

export interface GameTypeRow {
  event_type: string;
  total_uses: Num;
  unique_users: Num;
}

export interface FiftyRow {
  question_id: Num;
  uses: Num;
  unique_users: Num;
}

export interface TimelineRow {
  hour: string;
  cnt: Num;
}

export interface LivesRow {
  lives_remaining: Num;
  count: Num;
}

export interface StudentRow {
  attempt_id: number;
  user_id: number;
  username: string | null;
  score: Num;
  percentage: Num;
  correct_answers: Num;
  wrong_answers: Num;
  skipped_questions: Num;
  time_taken: Num;
  rank: Num;
  status: string | null;
  completed_at: string | null;
}

export interface DifficultyStat {
  difficulty: Num;
  difficulty_name: string | null;
  responses: Num;
  correct: Num;
  avg_time: Num;
  accuracy: Num;
}

export interface AnalyticsData {
  stats: AnalyticsStats;
  question_stats: QuestionStat[];
  quiz: { id: number; total_marks: Num; passing_marks: Num } | null;
  score_distribution: { bucket: Num; count: Num }[];
  score_vs_time: ScatterPoint[];
  funnel: FunnelRow[];
  difficulty_stats: DifficultyStat[];
  game: { total_events: Num; by_type: GameTypeRow[] };
  fifty_fifty_by_question: FiftyRow[];
  powerup_timeline: TimelineRow[];
  lives_distribution: LivesRow[];
  students: StudentRow[];
  insights: string[];
}

export interface QuizMeta {
  id: number;
  name: string;
  code: string;
  status: string | null;
  difficulty_name: string | null;
  total_marks: number | null;
}
