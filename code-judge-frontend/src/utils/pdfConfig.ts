/**
 * Strongly-typed configuration for question-paper PDF generation.
 * This single object drives BOTH the real jsPDF renderer and the live canvas
 * preview, so the preview always reflects exactly what the PDF will contain.
 */

export type PdfLayout = "full-width" | "two-column";
export type PdfPageSize = "a4" | "letter";
export type PdfOrientation = "portrait" | "landscape";
export type PdfMargins = "normal" | "narrow" | "wide";
export type PdfFontFamily = "inter" | "arial" | "times" | "georgia" | "helvetica";
export type PdfHeadingSize = "small" | "medium" | "large";
export type PdfSpacing = "compact" | "normal" | "relaxed";
export type PdfQuestionSpacing = "compact" | "normal" | "spacious";
export type PdfAnswerPlacement = "after-question" | "end";
export type PdfStudentField = "name" | "username" | "rollNo";
export type PdfStudentSource = "registered" | "blank";
export type PdfStudentFormat = "inline" | "separate-lines" | "blank";
export type PdfStudentPlacement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "below-header"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
export type PdfGenerationMode = "single" | "individual" | "combined";

export interface PdfContentConfig {
  includeAnswers: boolean;
  answerPlacement: PdfAnswerPlacement;
}

export interface PdfPageConfig {
  size: PdfPageSize;
  orientation: PdfOrientation;
  layout: PdfLayout;
  margins: PdfMargins;
}

export interface PdfTypographyConfig {
  fontFamily: PdfFontFamily;
  questionSize: number;
  optionSize: number;
  headingSize: PdfHeadingSize;
  lineSpacing: PdfSpacing;
  questionSpacing: PdfQuestionSpacing;
}

export interface PdfHeaderConfig {
  showQuizName: boolean;
  showSubject: boolean;
  showQuestionCount: boolean;
  showMarks: boolean;
  showDuration: boolean;
  showDifficulty: boolean;
  showVisibility: boolean;
  showQuizId: boolean;
}

export interface PdfStudentDetailsConfig {
  enabled: boolean;
  source: PdfStudentSource;
  fields: PdfStudentField[];
  placement: PdfStudentPlacement;
  format: PdfStudentFormat;
}

export interface PdfGenerationConfig {
  mode: PdfGenerationMode;
  selectedStudentIds: number[] | null;
}

export interface PdfFooterConfig {
  enabled: boolean;
  showQuizId: boolean;
  showDateTime: boolean;
  showPageNumber: boolean;
}

export interface PdfConfig {
  content: PdfContentConfig;
  page: PdfPageConfig;
  typography: PdfTypographyConfig;
  header: PdfHeaderConfig;
  studentDetails: PdfStudentDetailsConfig;
  generation: PdfGenerationConfig;
  footer: PdfFooterConfig;
}

/**
 * A printable student identity for the PDF. When rendering blank / generic
 * papers every field is undefined so the blank-line style is used.
 */
export interface PdfStudent {
  id: number;
  name?: string;
  username?: string;
  rollNo?: string;
}

export const PDF_QUESTION_SIZES = [10, 11, 12, 13, 14, 15, 16];
export const PDF_OPTION_SIZES = [9, 10, 11, 12, 13, 14];

export const PDF_FIELD_LABELS: Record<PdfStudentField, string> = {
  name: "Name",
  username: "Username",
  rollNo: "Roll No.",
};

export const PDF_DEFAULTS: PdfConfig = {
  content: {
    includeAnswers: false,
    answerPlacement: "end",
  },
  page: {
    size: "a4",
    orientation: "portrait",
    layout: "full-width",
    margins: "normal",
  },
  typography: {
    fontFamily: "arial",
    questionSize: 12,
    optionSize: 10,
    headingSize: "medium",
    lineSpacing: "normal",
    questionSpacing: "normal",
  },
  header: {
    showQuizName: true,
    showSubject: true,
    showQuestionCount: true,
    showMarks: true,
    showDuration: true,
    showDifficulty: true,
    showVisibility: true,
    showQuizId: true,
  },
  studentDetails: {
    enabled: false,
    source: "registered",
    fields: ["name", "username", "rollNo"],
    placement: "top-right",
    format: "separate-lines",
  },
  generation: {
    mode: "single",
    selectedStudentIds: null,
  },
  footer: {
    enabled: true,
    showQuizId: true,
    showDateTime: true,
    showPageNumber: true,
  },
};

export function makeDefaultConfig(): PdfConfig {
  return JSON.parse(JSON.stringify(PDF_DEFAULTS)) as PdfConfig;
}

export const MARGIN_MM: Record<PdfMargins, number> = {
  narrow: 10,
  normal: 16,
  wide: 24,
};

export function pageSizeMm(
  size: PdfPageSize,
  orientation: PdfOrientation
): { width: number; height: number } {
  const portrait = size === "a4" ? { width: 210, height: 297 } : { width: 215.9, height: 279.4 };
  return orientation === "portrait" ? portrait : { width: portrait.height, height: portrait.width };
}

export const LINE_SPACING_FACTOR: Record<PdfSpacing, number> = {
  compact: 1.15,
  normal: 1.3,
  relaxed: 1.45,
};

export const QUESTION_SPACING_MM: Record<PdfQuestionSpacing, number> = {
  compact: 1.5,
  normal: 3,
  spacious: 5,
};

export const HEADING_SIZE_PT: Record<PdfHeadingSize, number> = {
  small: 13,
  medium: 15,
  large: 17,
};

/** Map the UI font choice to the closest PDF-safe base font and CSS family. */
export function toBaseFont(family: PdfFontFamily): { base: "helvetica" | "times"; css: string } {
  switch (family) {
    case "times":
    case "georgia":
      return { base: "times", css: family === "georgia" ? "Georgia, serif" : "'Times New Roman', Times, serif" };
    case "inter":
      return { base: "helvetica", css: "Inter, system-ui, sans-serif" };
    case "arial":
      return { base: "helvetica", css: "Arial, Helvetica, sans-serif" };
    case "helvetica":
    default:
      return { base: "helvetica", css: "Helvetica, Arial, sans-serif" };
  }
}