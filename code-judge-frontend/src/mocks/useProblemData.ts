import { useState, useEffect } from "react";
import { mockSubmissions } from "./submissions";
import { mockDiscussions } from "./discussions";
import { mockEditorial } from "./editorial";
import { mockSolutions } from "./solutions";
import { mockAIAnalysis } from "./aiAnalysis";
import { mockHints } from "./hints";
import { mockStatistics } from "./statistics";
import { mockSimilarProblems } from "./similarProblems";

export interface ProblemData {
  submissions: typeof mockSubmissions;
  discussions: typeof mockDiscussions;
  editorial: typeof mockEditorial;
  solutions: typeof mockSolutions;
  aiAnalysis: typeof mockAIAnalysis;
  hints: typeof mockHints;
  statistics: typeof mockStatistics;
  similarProblems: typeof mockSimilarProblems;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useProblemData(problemId?: string) {
  const [data, setData] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    delay(350 + Math.random() * 150)
      .then(() => {
        if (cancelled) return;
        setData({
          submissions: mockSubmissions,
          discussions: mockDiscussions,
          editorial: mockEditorial,
          solutions: mockSolutions,
          aiAnalysis: mockAIAnalysis,
          hints: mockHints,
          statistics: mockStatistics,
          similarProblems: mockSimilarProblems,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load problem data");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [problemId]);

  return { data, loading, error };
}