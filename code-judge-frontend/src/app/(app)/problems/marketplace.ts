/**
 * Problems marketplace — mock discovery dataset.
 *
 * The Problems section is a unified practice marketplace covering every major
 * competitive exam (JEE, NEET, SSC, UPSC, GATE, CAT, Banking, Railway, State
 * PSC, CUET, UGC NET), academic subjects, and programming/DSA. Real problems
 * from the backend are merged in as "Programming & DSA" entries via
 * `mergeProblems()` so the whole page works today and switches to live data
 * later without touching components.
 */

import type { ProblemListItem } from "@/types/problem";

export type ProblemType =
  | "MCQ"
  | "Numerical"
  | "Multi-correct"
  | "Integer"
  | "Coding"
  | "Previous Year";

export type ProblemDifficulty = "easy" | "medium" | "hard";

export interface MarketplaceProblem {
  /** Local unique id (React key). */
  id: string;
  /** Linkable problem id shown in the UI and used for /problems/{id}. */
  problem_id: string;
  title: string;
  examId: string;
  examLabel: string;
  subject: string;
  topic: string;
  type: ProblemType;
  difficulty: ProblemDifficulty;
  /** Rating-style number (800…2400). Only coding problems carry one. */
  rating: number;
  tags: string[];
  solves: number;
  attempts: number;
  acceptance: number;
  free: boolean;
  /** Human "N d ago" freshness label. */
  updated: string;
  /** Days since added — drives "Recently Added". */
  addedDaysAgo: number;
  /** 0–100 heat — drives "Popular Problems". */
  hot: number;
  recommended: boolean;
  source: string;
  contest_id: string | null;
  problem_index: string | null;
  /** True when this row came from the backend rather than the mock dataset. */
  real: boolean;
}

/* ============================================
   Exams — the top-level filter
   ============================================ */
export const PROBLEM_EXAMS: { id: string; label: string }[] = [
  { id: "all", label: "All Exams" },
  { id: "programming", label: "Programming & DSA" },
  { id: "jee", label: "JEE" },
  { id: "neet", label: "NEET" },
  { id: "ssc", label: "SSC" },
  { id: "upsc", label: "UPSC" },
  { id: "gate", label: "GATE" },
  { id: "cat", label: "CAT" },
  { id: "banking", label: "Banking" },
  { id: "railway", label: "Railway" },
  { id: "state-psc", label: "State PSC" },
  { id: "cuet", label: "CUET" },
  { id: "ugc-net", label: "UGC NET" },
  { id: "other", label: "Other Competitive" },
];

/* Small gradient tiles for exam badges across cards + table. */
export const EXAM_STYLES: Record<string, { short: string; gradient: string }> = {
  jee: { short: "JEE", gradient: "from-indigo-500 to-sky-400" },
  neet: { short: "NEET", gradient: "from-emerald-500 to-teal-400" },
  ssc: { short: "SSC", gradient: "from-amber-500 to-orange-400" },
  upsc: { short: "UPSC", gradient: "from-rose-500 to-pink-400" },
  gate: { short: "GATE", gradient: "from-cyan-500 to-teal-400" },
  cat: { short: "CAT", gradient: "from-orange-500 to-yellow-400" },
  banking: { short: "BANK", gradient: "from-sky-500 to-blue-400" },
  railway: { short: "RLY", gradient: "from-orange-600 to-amber-400" },
  "state-psc": { short: "PSC", gradient: "from-slate-500 to-slate-300" },
  cuet: { short: "CUET", gradient: "from-violet-500 to-fuchsia-400" },
  "ugc-net": { short: "NET", gradient: "from-fuchsia-500 to-rose-400" },
  programming: { short: "DSA", gradient: "from-blue-600 to-violet-500" },
  other: { short: "APT", gradient: "from-teal-500 to-emerald-400" },
};

/* ============================================
   Subjects — dynamic based on the selected exam
   ============================================ */
export const EXAM_SUBJECTS: Record<string, string[]> = {
  jee: ["Physics", "Chemistry", "Mathematics"],
  neet: ["Physics", "Chemistry", "Biology"],
  ssc: ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
  upsc: ["History", "Geography", "Polity", "Economy", "Environment", "Science & Technology"],
  gate: ["Computer Science", "Electrical", "Mechanical", "Aptitude"],
  cat: ["Quantitative Aptitude", "VARC", "DILR"],
  banking: ["Quantitative Aptitude", "Reasoning", "English", "General Awareness"],
  railway: ["Mathematics", "Reasoning", "General Awareness"],
  "state-psc": ["History", "Geography", "Polity", "General Studies"],
  cuet: ["Mathematics", "Physics", "Chemistry", "Biology", "General Test"],
  "ugc-net": ["Paper 1 (Teaching)", "Paper 2 Subject"],
  programming: ["DSA", "C++", "Java", "Python", "SQL", "Algorithms", "System Design"],
  other: ["Aptitude", "Reasoning", "English"],
};

/* ============================================
   Topics — drill-down after a subject is picked
   ============================================ */
export const SUBJECT_TOPICS: Record<string, string[]> = {
  Physics: ["Mechanics", "Thermodynamics", "Electrostatics", "Optics", "Modern Physics"],
  Chemistry: ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry"],
  Mathematics: ["Algebra", "Calculus", "Coordinate Geometry", "Trigonometry", "Probability"],
  Biology: ["Genetics", "Botany", "Zoology", "Human Physiology"],
  "Quantitative Aptitude": ["Arithmetic", "Algebra", "Number System", "Percentage"],
  Reasoning: ["Puzzles", "Seating Arrangement", "Logical Deduction"],
  English: ["Grammar", "Reading Comprehension", "Vocabulary"],
  "General Awareness": ["Current Affairs", "Static GK"],
  History: ["Modern India", "Ancient India", "Medieval India"],
  Geography: ["Indian Geography", "Physical Geography"],
  Polity: ["Constitution", "Governance"],
  Economy: ["Indian Economy", "Macroeconomics"],
  Environment: ["Ecology", "Biodiversity"],
  "Science & Technology": ["Space", "Biotech"],
  "Computer Science": ["Data Structures", "Algorithms", "Databases"],
  VARC: ["Reading Comprehension", "Verbal Ability"],
  DILR: ["Data Interpretation", "Logical Reasoning"],
  "Paper 1 (Teaching)": ["Teaching Aptitude", "Research Aptitude"],
  DSA: ["Arrays", "Trees", "Graphs", "DP", "Strings", "Binary Search"],
  Algorithms: ["Sorting", "Searching", "Greedy", "Backtracking"],
  SQL: ["SQL"],
  Aptitude: ["Arithmetic", "Number System"],
  "General Studies": ["Geography", "History", "Polity"],
  "General Test": ["Numerical Ability", "Reasoning", "General Knowledge"],
  "Paper 2 Subject": ["Subject Syllabus"],
};

export const PROBLEM_TYPES: ProblemType[] = [
  "MCQ",
  "Numerical",
  "Multi-correct",
  "Integer",
  "Coding",
  "Previous Year",
];

/* ============================================
   Mock problems — the marketplace dataset
   ============================================ */

interface ProblemDef {
  problem_id: string;
  title: string;
  examId: string;
  subject: string;
  topic: string;
  type?: ProblemType;
  difficulty?: ProblemDifficulty;
  rating?: number;
  tags?: string[];
  solves?: number;
  attempts?: number;
  acceptance?: number;
  free?: boolean;
  updated?: string;
  addedDaysAgo?: number;
  hot?: number;
  recommended?: boolean;
  source?: string;
}

function pb(def: ProblemDef, index: number): MarketplaceProblem {
  const solves = def.solves ?? 4000 + index * 900;
  const attempts = def.attempts ?? Math.round(solves * 2.4);
  const acceptance = def.acceptance ?? Math.round((solves / attempts) * 100);
  return {
    id: `mock_${def.problem_id}_${index}`,
    problem_id: def.problem_id,
    title: def.title,
    examId: def.examId,
    examLabel: PROBLEM_EXAMS.find((e) => e.id === def.examId)?.label ?? def.examId,
    subject: def.subject,
    topic: def.topic,
    type: def.type ?? "MCQ",
    difficulty: def.difficulty ?? "medium",
    rating: def.rating ?? 0,
    tags: def.tags ?? [],
    solves,
    attempts,
    acceptance,
    free: def.free ?? true,
    updated: def.updated ?? "2d ago",
    addedDaysAgo: def.addedDaysAgo ?? (index % 12) + 1,
    hot: def.hot ?? 50 + ((index * 7) % 45),
    recommended: def.recommended ?? false,
    source: def.source ?? "ByteClash",
    contest_id: null,
    problem_index: null,
    real: false,
  };
}

export const MARKETPLACE_PROBLEMS: MarketplaceProblem[] = [
  // JEE
  pb({ problem_id: "JEE-PHY-01", title: "Laws of Motion — Newton's Second Law", examId: "jee", subject: "Physics", topic: "Mechanics", type: "MCQ", difficulty: "easy", solves: 18400, attempts: 41200, free: true, updated: "1d ago", addedDaysAgo: 1, hot: 92, recommended: true, tags: ["Laws of Motion", "Friction"] }, 0),
  pb({ problem_id: "JEE-PHY-02", title: "Thermodynamics — Isothermal Processes", examId: "jee", subject: "Physics", topic: "Thermodynamics", type: "Numerical", difficulty: "medium", solves: 9200, attempts: 23400, updated: "3d ago", addedDaysAgo: 6, hot: 71, tags: ["Thermodynamics"] }, 1),
  pb({ problem_id: "JEE-CHEM-01", title: "Equilibrium — Le Chatelier's Principle", examId: "jee", subject: "Chemistry", topic: "Physical Chemistry", type: "MCQ", difficulty: "medium", solves: 7400, attempts: 16800, free: false, updated: "5d ago", addedDaysAgo: 9, hot: 58, tags: ["Equilibrium"] }, 2),
  pb({ problem_id: "JEE-MATH-01", title: "Quadratic Equations — Roots & Discriminant", examId: "jee", subject: "Mathematics", topic: "Algebra", type: "MCQ", difficulty: "easy", solves: 15600, attempts: 33000, free: true, updated: "2d ago", addedDaysAgo: 3, hot: 85, recommended: true, tags: ["Quadratic", "Algebra"] }, 3),
  // NEET
  pb({ problem_id: "NEET-BIO-01", title: "Genetics — Mendelian Inheritance", examId: "neet", subject: "Biology", topic: "Genetics", type: "MCQ", difficulty: "easy", solves: 13200, attempts: 29800, free: true, updated: "1d ago", addedDaysAgo: 2, hot: 88, recommended: true, tags: ["Genetics", "Mendel"] }, 4),
  pb({ problem_id: "NEET-PHY-01", title: "Kinematics — Projectile Motion", examId: "neet", subject: "Physics", topic: "Mechanics", type: "Numerical", difficulty: "medium", solves: 6800, attempts: 15700, free: true, updated: "4d ago", addedDaysAgo: 8, hot: 63, tags: ["Kinematics"] }, 5),
  pb({ problem_id: "NEET-CHEM-01", title: "Organic Chemistry — Reaction Mechanisms", examId: "neet", subject: "Chemistry", topic: "Organic Chemistry", type: "MCQ", difficulty: "hard", solves: 4100, attempts: 11300, free: false, updated: "6d ago", addedDaysAgo: 11, hot: 49, tags: ["GOC", "Mechanism"] }, 6),
  // SSC
  pb({ problem_id: "SSC-QA-01", title: "Algebra — Linear Equations", examId: "ssc", subject: "Quantitative Aptitude", topic: "Algebra", type: "MCQ", difficulty: "easy", solves: 22100, attempts: 47500, free: true, updated: "1d ago", addedDaysAgo: 1, hot: 95, recommended: true, tags: ["Linear Equations", "Algebra"] }, 7),
  pb({ problem_id: "SSC-REAS-01", title: "Seating Arrangement — Circular Puzzle", examId: "ssc", subject: "Reasoning", topic: "Puzzles", type: "MCQ", difficulty: "medium", solves: 9800, attempts: 22600, free: true, updated: "3d ago", addedDaysAgo: 7, hot: 72, tags: ["Puzzles", "Seating"] }, 8),
  pb({ problem_id: "SSC-GA-01", title: "Static GK — Indian Constitution Basics", examId: "ssc", subject: "General Awareness", topic: "Static GK", type: "MCQ", difficulty: "easy", solves: 17600, attempts: 39100, free: false, updated: "5d ago", addedDaysAgo: 10, hot: 66, tags: ["Static GK"] }, 9),
  // UPSC
  pb({ problem_id: "UPSC-HIS-01", title: "Modern India — Freedom Struggle Timeline", examId: "upsc", subject: "History", topic: "Modern India", type: "MCQ", difficulty: "hard", solves: 5200, attempts: 14100, free: true, updated: "2d ago", addedDaysAgo: 4, hot: 61, recommended: true, tags: ["Freedom Struggle"] }, 10),
  pb({ problem_id: "UPSC-POL-01", title: "Constitution — Fundamental Rights", examId: "upsc", subject: "Polity", topic: "Constitution", type: "MCQ", difficulty: "medium", solves: 7400, attempts: 16800, free: true, updated: "4d ago", addedDaysAgo: 9, hot: 64, tags: ["Polity", "Fundamental Rights"] }, 11),
  pb({ problem_id: "UPSC-ECO-01", title: "Indian Economy — Budget & Fiscal Policy", examId: "upsc", subject: "Economy", topic: "Indian Economy", type: "MCQ", difficulty: "medium", solves: 3100, attempts: 8700, free: false, updated: "6d ago", addedDaysAgo: 12, hot: 40, tags: ["Budget"] }, 12),
  // GATE
  pb({ problem_id: "GATE-CS-01", title: "Data Structures — AVL Tree Rotations", examId: "gate", subject: "Computer Science", topic: "Data Structures", type: "Coding", difficulty: "medium", rating: 1400, solves: 6100, attempts: 13900, free: true, updated: "2d ago", addedDaysAgo: 5, hot: 68, tags: ["Trees", "AVL"] }, 13),
  pb({ problem_id: "GATE-CS-02", title: "Algorithms — 0/1 Knapsack", examId: "gate", subject: "Computer Science", topic: "Algorithms", type: "Coding", difficulty: "hard", rating: 1900, solves: 3600, attempts: 10400, free: false, updated: "5d ago", addedDaysAgo: 10, hot: 55, tags: ["DP", "Knapsack"] }, 14),
  // CAT
  pb({ problem_id: "CAT-QA-01", title: "Arithmetic — Profit, Loss & Discount", examId: "cat", subject: "Quantitative Aptitude", topic: "Arithmetic", type: "MCQ", difficulty: "easy", solves: 8800, attempts: 20400, free: true, updated: "1d ago", addedDaysAgo: 2, hot: 77, tags: ["Arithmetic", "Profit Loss"] }, 15),
  pb({ problem_id: "CAT-VARC-01", title: "Reading Comprehension — Inferential Questions", examId: "cat", subject: "VARC", topic: "Reading Comprehension", type: "MCQ", difficulty: "medium", solves: 5600, attempts: 13900, free: true, updated: "3d ago", addedDaysAgo: 8, hot: 59, tags: ["RC"] }, 16),
  // Banking
  pb({ problem_id: "BANK-QA-01", title: "Percentage — Successive Changes", examId: "banking", subject: "Quantitative Aptitude", topic: "Arithmetic", type: "MCQ", difficulty: "easy", solves: 20100, attempts: 43100, free: true, updated: "1d ago", addedDaysAgo: 1, hot: 91, recommended: true, tags: ["Percentage"] }, 17),
  pb({ problem_id: "BANK-REAS-01", title: "Puzzles — Scheduling Based", examId: "banking", subject: "Reasoning", topic: "Puzzles", type: "MCQ", difficulty: "medium", solves: 7200, attempts: 17100, free: false, updated: "4d ago", addedDaysAgo: 9, hot: 62, tags: ["Puzzles", "Scheduling"] }, 18),
  // Railway
  pb({ problem_id: "RLY-MATH-01", title: "Time & Work — Efficiency Ratios", examId: "railway", subject: "Mathematics", topic: "Arithmetic", type: "MCQ", difficulty: "easy", solves: 16800, attempts: 36200, free: true, updated: "2d ago", addedDaysAgo: 4, hot: 82, recommended: true, tags: ["Time & Work"] }, 19),
  pb({ problem_id: "RLY-REAS-01", title: "Analogy — Word Relationships", examId: "railway", subject: "Reasoning", topic: "Logical Deduction", type: "MCQ", difficulty: "easy", solves: 12400, attempts: 27400, free: true, updated: "5d ago", addedDaysAgo: 11, hot: 65, tags: ["Analogy"] }, 20),
  // State PSC
  pb({ problem_id: "PSC-GS-01", title: "General Studies — State Geography", examId: "state-psc", subject: "Geography", topic: "Indian Geography", type: "MCQ", difficulty: "medium", solves: 2600, attempts: 7300, free: false, updated: "6d ago", addedDaysAgo: 13, hot: 35, tags: ["Geography"] }, 21),
  // CUET
  pb({ problem_id: "CUET-MATH-01", title: "Algebra — Matrices & Determinants", examId: "cuet", subject: "Mathematics", topic: "Algebra", type: "MCQ", difficulty: "medium", solves: 4300, attempts: 10800, free: true, updated: "3d ago", addedDaysAgo: 7, hot: 52, tags: ["Matrices"] }, 22),
  pb({ problem_id: "CUET-PHY-01", title: "Mechanics — Work, Energy & Power", examId: "cuet", subject: "Physics", topic: "Mechanics", type: "Numerical", difficulty: "easy", solves: 5900, attempts: 13200, free: true, updated: "4d ago", addedDaysAgo: 10, hot: 47, tags: ["Work Energy"] }, 23),
  // UGC NET
  pb({ problem_id: "NET-P1-01", title: "Teaching Aptitude — Learning Theories", examId: "ugc-net", subject: "Paper 1 (Teaching)", topic: "Teaching Aptitude", type: "MCQ", difficulty: "medium", solves: 2200, attempts: 6100, free: false, updated: "5d ago", addedDaysAgo: 12, hot: 33, tags: ["Teaching Aptitude"] }, 24),
  // Other
  pb({ problem_id: "APT-01", title: "Aptitude — Ages & Ratios", examId: "other", subject: "Aptitude", topic: "Arithmetic", type: "MCQ", difficulty: "easy", solves: 9400, attempts: 21300, free: true, updated: "3d ago", addedDaysAgo: 8, hot: 60, tags: ["Aptitude", "Ratio"] }, 25),
];

/* ============================================
   Merge backend problems into the marketplace
   as "Programming & DSA" entries.
   ============================================ */
export function mergeProblems(real: ProblemListItem[]): MarketplaceProblem[] {
  const realOnes: MarketplaceProblem[] = real.map((p) => {
    const rating = p.rating ?? 0;
    const solves = Math.max(100, 50000 - rating * 20);
    const acceptance = Math.max(20, Math.min(90, 100 - Math.floor(rating / 25)));
    return {
      id: `real_${p.problem_id}`,
      problem_id: p.problem_id,
      title: p.title,
      examId: "programming",
      examLabel: "Programming & DSA",
      subject: "DSA",
      topic: p.tags[0] ?? "General",
      type: "Coding",
      difficulty: rating >= 1600 ? "hard" : rating >= 1200 ? "medium" : "easy",
      rating,
      tags: p.tags,
      solves,
      attempts: Math.round(solves / Math.max(0.01, acceptance / 100)),
      acceptance,
      free: true,
      updated: "2d ago",
      addedDaysAgo: 2,
      hot: Math.max(30, Math.round(100 - rating / 20)),
      recommended: rating >= 1200 && rating <= 1600,
      source: p.source ?? "Codeforces",
      contest_id: p.contest_id,
      problem_index: p.problem_index,
      real: true,
    };
  });
  return [...MARKETPLACE_PROBLEMS, ...realOnes];
}