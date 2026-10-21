export interface PaperHeaderMeta {
  instituteName: string;
  heading: string;
  subject: string;
  className: string;
  date: string;
  timeAllowed: string;
  setName: string;
  showStudentBlock: boolean;
  easyMarks: number;
  mediumMarks: number;
  hardMarks: number;
  /** One instruction per line; empty means the default instructions are used. */
  instructions: string;
}

export const DEFAULT_PAPER_HEADER: PaperHeaderMeta = {
  instituteName: "",
  heading: "Question Paper",
  subject: "",
  className: "",
  date: "",
  timeAllowed: "",
  setName: "A",
  showStudentBlock: true,
  easyMarks: 2,
  mediumMarks: 5,
  hardMarks: 10,
  instructions: "",
};

export const PAPER_HEADING_PRESETS = [
  "Question Paper",
  "Assignment",
  "Unit Test",
  "Mid Semester Examination",
  "Practice Sheet",
] as const;

export function withPaperHeaderDefaults(meta?: Partial<PaperHeaderMeta>): PaperHeaderMeta {
  const merged = { ...DEFAULT_PAPER_HEADER, ...meta };
  return {
    ...merged,
    easyMarks: Number.isFinite(merged.easyMarks) ? merged.easyMarks : DEFAULT_PAPER_HEADER.easyMarks,
    mediumMarks: Number.isFinite(merged.mediumMarks) ? merged.mediumMarks : DEFAULT_PAPER_HEADER.mediumMarks,
    hardMarks: Number.isFinite(merged.hardMarks) ? merged.hardMarks : DEFAULT_PAPER_HEADER.hardMarks,
    instructions: typeof merged.instructions === "string" ? merged.instructions : "",
  };
}

/** Parse common "Time allowed" values ("180 minutes", "3 hours", "2.5 hrs"). */
export function parseTimeAllowedMinutes(value?: string): number | undefined {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return undefined;

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/);
  const bareNumber = text.match(/^\s*(\d+(?:\.\d+)?)\s*$/);

  let minutes: number | undefined;
  if (hourMatch) minutes = Number(hourMatch[1]) * 60;
  else if (minuteMatch) minutes = Number(minuteMatch[1]);
  else if (bareNumber) minutes = Number(bareNumber[1]);

  if (minutes === undefined || !Number.isFinite(minutes) || minutes < 10) return undefined;
  return Math.min(600, Math.round(minutes));
}

/** Marks for a question based on its difficulty label (Easy / Medium / Hard / Expert). */
export function marksForDifficulty(header: PaperHeaderMeta, difficulty?: string | null): number {
  const value = (difficulty ?? "").toLowerCase();
  if (value.includes("easy")) return header.easyMarks;
  if (value.includes("hard") || value.includes("expert")) return header.hardMarks;
  return header.mediumMarks;
}
