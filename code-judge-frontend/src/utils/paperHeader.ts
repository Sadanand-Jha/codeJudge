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
  };
}

/** Marks for a question based on its difficulty label (Easy / Medium / Hard / Expert). */
export function marksForDifficulty(header: PaperHeaderMeta, difficulty?: string | null): number {
  const value = (difficulty ?? "").toLowerCase();
  if (value.includes("easy")) return header.easyMarks;
  if (value.includes("hard") || value.includes("expert")) return header.hardMarks;
  return header.mediumMarks;
}
