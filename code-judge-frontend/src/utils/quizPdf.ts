import { jsPDF } from "jspdf";
import { CreatorQuestion } from "@/components/quiz/creator/types";
import {
  PdfConfig,
  PdfStudent,
  PdfStudentPlacement,
  QUESTION_SPACING_MM,
  LINE_SPACING_FACTOR,
  HEADING_SIZE_PT,
  pageSizeMm,
  MARGIN_MM,
  toBaseFont,
  PDF_FIELD_LABELS,
} from "@/utils/pdfConfig";

/**
 * Drawing-agnostic page element model. The real jsPDF renderer and the live
 * canvas preview both consume exactly this output, so the teacher's preview
 * matches the final PDF text-for-text.
 */

export type PdfBaseFont = "helvetica" | "times" | "courier";
export type PdfTextStyle = "normal" | "bold" | "italic";

export interface PdfTextEl {
  kind: "text";
  base: PdfBaseFont;
  css: string;
  style: PdfTextStyle;
  sizePt: number;
  x: number;
  y: number;
  text: string;
}

export interface PdfLineEl {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  widthMm: number;
}

export interface PdfImageEl {
  kind: "image";
  dataUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PdfPageEl = PdfTextEl | PdfLineEl | PdfImageEl;

export interface PdfPageModel {
  width: number;
  height: number;
  els: PdfPageEl[];
}

export interface QuizPdfMeta {
  quizName: string;
  subject?: string;
  description?: string;
  difficulty?: string;
  timeLimit?: string | number;
  topic?: string;
  visibility?: string;
  quizId?: string | number;
  creatorName?: string;
  totalQuestions: number;
  totalMarks: number;
}

export interface PaperInput {
  config: PdfConfig;
  meta: QuizPdfMeta;
  questions: CreatorQuestion[];
  student: PdfStudent | null;
}

/** A single jsPDF instance used for ALL text measurement (identical in preview + PDF). */
const MEASURE = new jsPDF({ unit: "mm", format: "a4" });

function toPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

/** Extract the body of a fenced ``` block, if present. */
function codeFence(html: string | null | undefined): { code: string[] | null; rest: string } {
  if (!html) return { code: null, rest: "" };
  const m = html.match(/```[\s\S]*?```/);
  if (!m) return { code: null, rest: html };
  const body = m[0].replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
  const lines = body
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim().length > 0);
  return { code: lines.length ? lines : null, rest: html.replace(m[0], "") };
}

function wrapLines(text: string, base: PdfBaseFont, style: PdfTextStyle, sizePt: number, widthMm: number): string[] {
  MEASURE.setFont(base, style);
  MEASURE.setFontSize(sizePt);
  return MEASURE.splitTextToSize(text, widthMm) as string[];
}

function lineHeightMm(sizePt: number, factor: number): number {
  return sizePt * 0.3528 * factor;
}

function textWidthMm(base: PdfBaseFont, style: PdfTextStyle, sizePt: number, text: string): number {
  MEASURE.setFont(base, style);
  MEASURE.setFontSize(sizePt);
  return MEASURE.getTextWidth(text) as number;
}

function emitText(
  out: PdfPageEl[],
  base: PdfBaseFont,
  css: string,
  style: PdfTextStyle,
  sizePt: number,
  x: number,
  y: number,
  text: string
): void {
  out.push({ kind: "text", base, css, style, sizePt, x, y, text });
}

/* ---------------------------------- Box model ---------------------------------- */

/** A measured, drawable unit of document content. The layout engine only deals
 *  with heights; a box draws itself relative to an origin (x, y). */
interface Box {
  height: number;
  draw(x: number, y: number, out: PdfPageEl[]): void;
}

interface Spec {
  base: PdfBaseFont;
  css: string;
  style: PdfTextStyle;
  sizePt: number;
  lineFactor: number;
}

function spacer(height: number): Box {
  return { height, draw: () => undefined };
}

interface LineSpec {
  text: string;
  xOff: number;
}

function boxFromLines(lines: LineSpec[], o: Spec, spaceAfter: number): Box {
  const ls = lineHeightMm(o.sizePt, o.lineFactor);
  return {
    height: (lines.length ? lines.length : 1) * ls + spaceAfter,
    draw: (x, y, out) => {
      lines.forEach((l, i) => {
        emitText(out, o.base, o.css, o.style, o.sizePt, x + l.xOff, y + i * ls, l.text);
      });
    },
  };
}

/** Wrap `body` with an optional hanging prefix (e.g. "1." or "A)"). */
function wrapHanging(prefix: string, body: string, o: Spec, width: number): LineSpec[] {
  if (!prefix) {
    return wrapLines(body, o.base, o.style, o.sizePt, width).map((t) => ({ text: t, xOff: 0 }));
  }
  const pad = textWidthMm(o.base, o.style, o.sizePt, `${prefix}  `);
  const avail = Math.max(width - pad, 12);
  const inner = wrapLines(body, o.base, o.style, o.sizePt, avail);
  if (!inner.length) return [{ text: prefix, xOff: 0 }];
  return inner.map((t, i) => ({
    text: i === 0 ? `${prefix}  ${t}` : t,
    xOff: i === 0 ? 0 : pad,
  }));
}

function plainLines(text: string, o: Spec, width: number, indent: number): LineSpec[] {
  return wrapLines(text, o.base, o.style, o.sizePt, Math.max(width - indent, 12)).map((t) => ({
    text: t,
    xOff: indent,
  }));
}

function codeBox(lines: string[], o: Spec, width: number): Box {
  const wrapped: string[] = [];
  MEASURE.setFont("courier", "normal");
  MEASURE.setFontSize(o.sizePt);
  for (const raw of lines) {
    const seg = MEASURE.splitTextToSize(raw || " ", width) as string[];
    wrapped.push(...(seg.length ? seg : [""]));
  }
  const ls = o.sizePt * 0.3528 * 1.25;
  return {
    height: wrapped.length * ls + 2,
    draw: (x, y, out) => {
      wrapped.forEach((l, i) => emitText(out, "courier", "Courier New, monospace", "normal", o.sizePt, x, y + i * ls, l));
    },
  };
}

function imageBox(url: string, width: number): Box {
  const embed = /^data:image\/(png|jpe?g|webp)/i.test(url) ? url : null;
  if (!embed) {
    return boxFromLines([{ text: "[Image]", xOff: 6 }], { base: "helvetica", css: "Helvetica, Arial, sans-serif", style: "italic", sizePt: 8, lineFactor: 1.3 }, 1.5);
  }
  let w = width;
  let h = 30;
  try {
    const probe = new jsPDF({ unit: "mm", format: "a4" });
    const props = probe.getImageProperties(embed) as unknown as { width: number; height: number };
    const ratio = props.height / props.width || 1;
    h = Math.min(width * ratio, 60);
    if (ratio >= 1) w = Math.min(width, h / ratio);
    else h = width * ratio;
  } catch {
    /* fall through */
  }
  return {
    height: h + 2,
    draw: (x, y, out) => {
      out.push({ kind: "image", dataUrl: embed, x: x + (width - w) / 2, y, w, h });
    },
  };
}

/** The answer labels for a single question (used per-question and for the answer key). */
export function answerLabels(q: CreatorQuestion): string {
  const labels = q.options
    .filter((o) => o.isCorrect)
    .map((o) => toPlainText(o.label).trim())
    .filter(Boolean);
  if (labels.length > 0) return labels.join(", ");
  if (Array.isArray(q.correctAnswer)) {
    return q.correctAnswer.map(String).filter(Boolean).join(", ") || "—";
  }
  const v = q.correctAnswer != null && q.correctAnswer !== -1 ? String(q.correctAnswer).trim() : "";
  return v || "—";
}

interface QuestionOpts {
  base: PdfBaseFont;
  css: string;
  questionPt: number;
  optionPt: number;
  lineFactor: number;
  includeAnswers: boolean;
  questionSpacing: number;
}

function buildQuestionBoxes(q: CreatorQuestion, index: number, width: number, o: QuestionOpts): Box[] {
  const boxes: Box[] = [];
  const qStyle: Spec = { base: o.base, css: o.css, style: "bold", sizePt: o.questionPt, lineFactor: o.lineFactor };
  const optStyle: Spec = { base: o.base, css: o.css, style: "normal", sizePt: o.optionPt, lineFactor: o.lineFactor };
  const ansStyle: Spec = { base: o.base, css: o.css, style: "bold", sizePt: o.optionPt, lineFactor: o.lineFactor };

  const { code, rest } = codeFence(q.title);
  const body = rest ? toPlainText(rest) : "";
  if (code && code.length) {
    boxes.push(boxFromLines(wrapHanging(`${index + 1}.`, body, qStyle, width), qStyle, 1.2));
    boxes.push(codeBox(code, { ...optStyle, base: "courier", css: "Courier New, monospace" }, width));
  } else {
    boxes.push(boxFromLines(wrapHanging(`${index + 1}.`, body || "Question", qStyle, width), qStyle, 1.2));
  }

  q.images.forEach((img) => boxes.push(imageBox(img.url, width)));

  q.options
    .filter((opt) => opt.content.trim() || opt.imageUrl)
    .forEach((opt) => {
      const content = opt.imageUrl ? "[Image]" : toPlainText(opt.content);
      boxes.push(boxFromLines(wrapHanging(`${opt.label || "•"})`, content, optStyle, width), optStyle, 1));
    });

  if (o.includeAnswers) {
    boxes.push(boxFromLines(wrapHanging("Answer:", answerLabels(q), ansStyle, width), ansStyle, 0.8));
    if (q.explanation && toPlainText(q.explanation)) {
      boxes.push(boxFromLines(plainLines(`Explanation: ${toPlainText(q.explanation)}`, optStyle, width, 6), optStyle, 0.8));
    }
    if (q.hint && toPlainText(q.hint)) {
      boxes.push(boxFromLines(plainLines(`Hint: ${toPlainText(q.hint)}`, { ...optStyle, style: "italic" }, width, 6), { ...optStyle, style: "italic" }, 0.8));
    }
    boxes.push(spacer(1.6));
  } else {
    boxes.push(spacer(o.questionSpacing));
  }

  return boxes;
}

/* ---------------------------------- Student details ---------------------------------- */

export function buildStudentLines(
  student: PdfStudent | null,
  fields: Array<"name" | "username" | "rollNo">,
  format: "inline" | "separate-lines" | "blank"
): string[] {
  if (format === "blank") {
    return fields.map((f) => `${PDF_FIELD_LABELS[f]}: ${"______________________________".slice(0, 20)}`);
  }
  const pick = (f: "name" | "username" | "rollNo") => {
    const v = f === "name" ? student?.name : f === "username" ? student?.username : student?.rollNo;
    return v && String(v).trim() ? String(v).trim() : "—";
  };
  const parts = fields.map((f) => `${PDF_FIELD_LABELS[f]}: ${pick(f)}`);
  return format === "inline" ? [parts.join("    ")] : parts;
}

function alignOf(placement: PdfStudentPlacement): "left" | "center" | "right" {
  if (placement.endsWith("-left")) return "left";
  if (placement.endsWith("-right")) return "right";
  return "center";
}

/** Render student detail lines at (margin + xBase, y) with the given alignment. */
function studentEls(
  lines: string[],
  align: "left" | "center" | "right",
  o: Spec,
  width: number,
  xBase: number,
  y: number
): { els: PdfPageEl[]; height: number } {
  const els: PdfPageEl[] = [];
  const ls = lineHeightMm(o.sizePt, o.lineFactor);
  let yy = y;
  lines.forEach((line) => {
    wrapLines(line, o.base, "normal", o.sizePt, width).forEach((l) => {
      const w = textWidthMm(o.base, "normal", o.sizePt, l);
      const x = align === "left" ? xBase : align === "right" ? xBase + width - w : xBase + (width - w) / 2;
      els.push({ kind: "text", base: o.base, css: o.css, style: "normal", sizePt: o.sizePt, x, y: yy, text: l });
      yy += ls;
    });
  });
  return { els, height: yy - y + 1 };
}

/* ---------------------------------- Header / footer ---------------------------------- */

interface HeaderPlan {
  els: PdfPageEl[];
  height: number;
}

function buildHeader(input: PaperInput, margin: number, width: number, first: boolean): HeaderPlan {
  if (!first) {
    // Subsequent pages: a slim top rule only — no title, no metadata.
    const els: PdfPageEl[] = [];
    const y = margin + 2;
    els.push({ kind: "line", x1: margin, y1: y, x2: margin + width, y2: y, widthMm: 0.5 });
    return { els, height: y + 5 - margin };
  }

  const { config, meta } = input;
  const headingPt = HEADING_SIZE_PT[config.typography.headingSize];
  const hdr = config.header;
  const fb = toBaseFont(config.typography.fontFamily);
  const els: PdfPageEl[] = [];
  let y = margin;

  const line = (text: string, style: PdfTextStyle, sizePt: number, align: "center" | "left", factor: number, after: number) => {
    const wrapped = wrapLines(text, fb.base, style, sizePt, width);
    const ls = lineHeightMm(sizePt, factor);
    wrapped.forEach((l) => {
      const w = textWidthMm(fb.base, style, sizePt, l);
      const x = align === "center" ? margin + (width - w) / 2 : margin;
      els.push({ kind: "text", base: fb.base, css: fb.css, style, sizePt, x, y, text: l });
      y += ls;
    });
    y += after;
  };

  if (hdr.showQuizName && meta.quizName) {
    line(toPlainText(meta.quizName).toUpperCase(), "bold", headingPt, "center", 1.2, 2);
  }

  const bits: string[] = [];
  if (hdr.showSubject && meta.subject) bits.push(`Subject: ${toPlainText(meta.subject)}`);
  if (hdr.showQuestionCount) bits.push(`Total Questions: ${meta.totalQuestions}`);
  if (hdr.showMarks) bits.push(`Total Marks: ${meta.totalMarks}`);
  if (hdr.showDuration && meta.timeLimit) bits.push(`Duration: ${meta.timeLimit}`);
  if (hdr.showDifficulty && meta.difficulty) bits.push(`Difficulty: ${toPlainText(meta.difficulty)}`);
  if (hdr.showVisibility && meta.visibility) bits.push(`Visibility: ${toPlainText(meta.visibility)}`);
  if (hdr.showQuizId) bits.push(`Quiz ID: ${meta.quizId ?? "—"}`);

  if (bits.length) {
    line(bits.join("   "), "normal", 9, "left", 1.3, 1.5);
  }

  const sd = config.studentDetails;
  const topPlacement = sd.enabled && sd.placement !== "bottom-left" && sd.placement !== "bottom-center" && sd.placement !== "bottom-right";
  if (topPlacement) {
    const align = alignOf(sd.placement);
    // Keep the top-right block clear of the right edge so long values (e.g.
    // 20-digit roll numbers) don't hug the margin.
    const studentW = align === "right" ? Math.max(40, width - 60) : width;
    const lines = buildStudentLines(input.student, sd.fields, sd.format);
    const block = studentEls(lines, align, { base: fb.base, css: fb.css, style: "normal", sizePt: config.typography.optionSize, lineFactor: LINE_SPACING_FACTOR[config.typography.lineSpacing] }, studentW, margin, y);
    els.push(...block.els);
    y += block.height;
    y += 1.5;
  }

  y += 1;
  els.push({ kind: "line", x1: margin, y1: y, x2: margin + width, y2: y, widthMm: 0.5 });
  y += 5;

  return { els, height: y - margin };
}

function footerEls(
  input: PaperInput,
  pageIndex: number,
  total: number,
  date: string,
  time: string,
  margin: number,
  pageW: number,
  pageH: number
): PdfPageEl[] {
  const els: PdfPageEl[] = [];
  const cfg = input.config;
  const sepY = pageH - margin - 9;
  els.push({ kind: "line", x1: margin, y1: sepY, x2: pageW - margin, y2: sepY, widthMm: 0.25 });

  const rowY = sepY + 4;
  const base = "helvetica" as PdfBaseFont;
  const css = "Helvetica, Arial, sans-serif";
  const sizePt = 8;

  // "PDF created by ByteClash" is always required. The optional date/time,
  // quiz ID and page number are gated by the footer toggle and their own flags.
  const extras = cfg.footer.enabled;
  const right = extras && cfg.footer.showPageNumber ? `Page ${pageIndex + 1} of ${total}` : "";
  const rightW = right ? textWidthMm(base, "normal", sizePt, right) : 0;
  const available = pageW - margin * 2 - rightW - 6;

  const bits = ["PDF created by ByteClash"];
  if (extras && cfg.footer.showDateTime) bits.push(`${date} ${time}`);
  if (extras && cfg.footer.showQuizId) bits.push(`Quiz ID: ${input.meta.quizId ?? "—"}`);
  const left = bits.join(" • ");
  if (textWidthMm(base, "normal", sizePt, left) > available) {
    let trimmed = bits[0];
    for (let i = 1; i < bits.length; i++) {
      const candidate = [trimmed, bits[i]].join(" • ");
      if (textWidthMm(base, "normal", sizePt, candidate) > available) break;
      trimmed = candidate;
    }
    els.push({ kind: "text", base, css, style: "normal", sizePt, x: margin, y: rowY, text: trimmed });
  } else {
    els.push({ kind: "text", base, css, style: "normal", sizePt, x: margin, y: rowY, text: left });
  }

  if (rightW > 0) {
    els.push({ kind: "text", base, css, style: "normal", sizePt, x: pageW - margin - rightW, y: rowY, text: right });
  }
  return els;
}

/* ---------------------------------- Layout pipeline ---------------------------------- */

const COL_GAP = 8;
const FOOTER_ZONE = 14;

interface Sink {
  pages: PdfPageEl[][];
  twoCol: boolean;
  x0: number;
  x1: number;
  colW: number;
  topOf: (page: number) => number;
  bottoms: (page: number) => number;
  page: number;
  col: number;
  y0: number;
  y1: number;
}

function curY(s: Sink): number {
  return s.col === 0 ? s.y0 : s.y1;
}

function curX(s: Sink): number {
  return s.col === 0 ? s.x0 : s.x1;
}

function setCurY(s: Sink, v: number): void {
  if (s.col === 0) s.y0 = v;
  else s.y1 = v;
}

function yOf(s: Sink, spot: { page: number; col: number }): number {
  if (spot.page !== s.page) return s.topOf(spot.page);
  return spot.col === 0 ? s.y0 : s.y1;
}

function nextPage(s: Sink): void {
  s.page += 1;
  s.col = 0;
  s.y0 = s.topOf(s.page);
  s.y1 = s.topOf(s.page);
  s.pages.push([]);
}

/** Ordered candidate spots for a block of the given height. */
function fittingSpot(s: Sink, height: number): { page: number; col: number } | null {
  const spots: Array<{ page: number; col: number }> = [];
  if (s.twoCol) {
    spots.push({ page: s.page, col: 0 }, { page: s.page, col: 1 });
    spots.sort((a, b) => yOf(s, a) - yOf(s, b));
  } else {
    spots.push({ page: s.page, col: 0 });
  }
  for (const spot of spots) {
    if (yOf(s, spot) + height <= s.bottoms(spot.page) - 0.05) return spot;
  }
  if (s.topOf(s.page + 1) + height <= s.bottoms(s.page + 1) - 0.05) {
    return { page: s.page + 1, col: 0 };
  }
  return null;
}

function goto(s: Sink, spot: { page: number; col: number }): void {
  if (spot.page !== s.page) {
    s.page = spot.page;
    s.y0 = s.topOf(spot.page);
    s.y1 = s.topOf(spot.page);
    if (!s.pages[spot.page]) s.pages.push([]);
  }
  s.col = spot.col;
}

/** Move to a fresh column/page after the current one is full (split mode). */
function advanceToFresh(s: Sink): void {
  if (s.twoCol && s.col === 0) {
    s.col = 1;
  } else {
    nextPage(s);
  }
}

function drawBox(s: Sink, box: Box): void {
  const y = curY(s);
  box.draw(curX(s), y, s.pages[s.page]);
  setCurY(s, y + box.height);
}

function drawBoxesAt(s: Sink, x: number, y: number, boxes: Box[]): void {
  let yy = y;
  for (const box of boxes) {
    while (yy + box.height > s.bottoms(s.page) - 0.05) {
      nextPage(s);
      yy = s.topOf(s.page);
      if (!s.twoCol) x = s.x0;
    }
    box.draw(x, yy, s.pages[s.page]);
    yy += box.height;
  }
  s.col = 0;
  s.y0 = yy;
  s.y1 = yy;
}

function isWide(q: CreatorQuestion): boolean {
  return q.images.length > 0 || q.options.some((o) => o.imageUrl) || codeFence(q.title).code !== null;
}

export function layoutQuestionPaper(input: PaperInput, date: string, time: string): PdfPageModel[] {
  const { config, questions } = input;
  const geo = pageSizeMm(config.page.size, config.page.orientation);
  const margin = MARGIN_MM[config.page.margins];
  const fb = toBaseFont(config.typography.fontFamily);
  const base = fb.base;
  const css = fb.css;
  const lineFactor = LINE_SPACING_FACTOR[config.typography.lineSpacing];
  const questionSpacing = QUESTION_SPACING_MM[config.typography.questionSpacing];
  const contentW = geo.width - margin * 2;

  const headerFirst = buildHeader(input, margin, contentW, true);
  const headerSlim = buildHeader(input, margin, contentW, false);
  const topOf = (p: number) =>
    Math.min(margin + (p === 0 ? headerFirst.height : headerSlim.height), geo.height - margin - FOOTER_ZONE - 8);

  const sd = config.studentDetails;
  const bottomPlace =
    sd.enabled && (sd.placement === "bottom-left" || sd.placement === "bottom-center" || sd.placement === "bottom-right");

  let bottomStudentEls: PdfPageEl[] = [];
  const sepY = geo.height - margin - 9;
  let contentBottom0 = geo.height - margin - FOOTER_ZONE;
  if (bottomPlace) {
    const lines = buildStudentLines(input.student, sd.fields, sd.format);
    const ls = lineHeightMm(config.typography.optionSize, lineFactor);
    let est = 0;
    lines.forEach((line) => {
      est += wrapLines(line, base, "normal", config.typography.optionSize, contentW).length * ls;
    });
    const blockH = est + 1;
    const yStart = sepY - blockH - 2;
    const block = studentEls(
      lines,
      alignOf(sd.placement),
      { base, css, style: "normal", sizePt: config.typography.optionSize, lineFactor },
      contentW,
      margin,
      yStart
    );
    bottomStudentEls = block.els;
    contentBottom0 = yStart - 1;
  }

  const ctx: QuestionOpts = {
    base,
    css,
    questionPt: config.typography.questionSize,
    optionPt: config.typography.optionSize,
    lineFactor,
    includeAnswers: config.content.includeAnswers,
    questionSpacing,
  };

  const pages: PdfPageEl[][] = [[]];
  const sink: Sink = {
    pages,
    twoCol: config.page.layout === "two-column",
    x0: margin,
    x1: margin + (contentW - COL_GAP) / 2 + COL_GAP,
    colW: (contentW - COL_GAP) / 2,
    topOf,
    bottoms: (p) => (p === 0 ? contentBottom0 : geo.height - margin - FOOTER_ZONE),
    page: 0,
    col: 0,
    y0: topOf(0),
    y1: topOf(0),
  };

  const placeQuestion = (i: number, q: CreatorQuestion) => {
    const full = !sink.twoCol || isWide(q);
    const width = full ? contentW : sink.colW;
    const boxes = buildQuestionBoxes(q, i, width, ctx);
    const height = boxes.reduce((s, b) => s + b.height, 0);

    if (full && sink.twoCol) {
      // Wide question in two-column layout: span the full printable width,
      // placed below the shorter column.
      const yBase = Math.max(sink.y0, sink.y1);
      if (yBase + height > sink.bottoms(sink.page)) {
        nextPage(sink);
        drawBoxesAt(sink, margin, sink.topOf(sink.page), boxes);
      } else {
        drawBoxesAt(sink, margin, yBase, boxes);
      }
      return;
    }

    const spot = fittingSpot(sink, height);
    if (spot) {
      goto(sink, spot);
      for (const box of boxes) drawBox(sink, box);
      return;
    }

    // Question taller than a whole column — split it only when unavoidable.
    const startCol = sink.twoCol ? (sink.y0 <= sink.y1 ? 0 : 1) : 0;
    goto(sink, { page: sink.page, col: startCol });
    for (const box of boxes) {
      while (box.height > 0 && curY(sink) + box.height > sink.bottoms(sink.page) - 0.05) {
        advanceToFresh(sink);
      }
      drawBox(sink, box);
    }
  };

  questions.forEach((q, i) => placeQuestion(i, q));

  if (config.content.includeAnswers && config.content.answerPlacement === "end") {
    const last = sink.pages[sink.pages.length - 1];
    if (last && last.length > 0) nextPage(sink);
    sink.twoCol = false;
    sink.col = 0;
    sink.y0 = sink.topOf(sink.page);
    const ansStyle: Spec = { base, css, style: "normal", sizePt: ctx.optionPt, lineFactor };
    const headingBox = boxFromLines(
      wrapLines("ANSWER KEY", base, "bold", ctx.optionPt + 2, contentW).map((t) => ({ text: t, xOff: 0 })),
      { ...ansStyle, style: "bold", sizePt: ctx.optionPt + 2 },
      3
    );
    const headingH = headingBox.height;
    const spot = fittingSpot(sink, headingH);
    if (spot) {
      goto(sink, spot);
      drawBox(sink, headingBox);
    }
    questions.forEach((q, i) => {
      const lineBox = boxFromLines(plainLines(`${i + 1}.  ${answerLabels(q)}`, ansStyle, contentW, 0), ansStyle, 1.2);
      const h = lineBox.height;
      const s = fittingSpot(sink, h);
      if (s) {
        goto(sink, s);
        drawBox(sink, lineBox);
      } else {
        for (const box of [lineBox]) {
          while (box.height > 0 && curY(sink) + box.height > sink.bottoms(sink.page) - 0.05) nextPage(sink);
          drawBox(sink, box);
        }
      }
    });
  }

  // Drop a trailing empty page if one was created but never filled.
  const last = sink.pages[sink.pages.length - 1];
  if (last && last.length === 0 && sink.pages.length > 1) sink.pages.pop();

  const total = sink.pages.length;
  return sink.pages.map((bodyEls, p) => ({
    width: geo.width,
    height: geo.height,
    els: [
      ...(p === 0 ? headerFirst.els : headerSlim.els),
      ...bodyEls,
      ...(p === 0 ? bottomStudentEls : []),
      ...footerEls(input, p, total, date, time, margin, geo.width, geo.height),
    ],
  }));
}

/* ---------------------------------- jsPDF rendering ---------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function footerDateTime(d = new Date()): { date: string; time: string } {
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  return { date, time };
}

/** Render the page models for a paper into a new jsPDF document. */
export function renderModelsToDoc(models: PdfPageModel[]): jsPDF {
  const geo = models[0];
  const doc = new jsPDF({ unit: "mm", format: [geo.width, geo.height], compress: true });

  models.forEach((model, i) => {
    if (i > 0) doc.addPage();
    for (const el of model.els) {
      switch (el.kind) {
        case "text": {
          doc.setFont(el.base, el.style);
          doc.setFontSize(el.sizePt);
          doc.setTextColor(0, 0, 0);
          doc.text(el.text, el.x, el.y);
          break;
        }
        case "line": {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(el.widthMm);
          doc.line(el.x1, el.y1, el.x2, el.y2);
          break;
        }
        case "image": {
          try {
            doc.addImage(el.dataUrl, "PNG", el.x, el.y, el.w, el.h);
          } catch {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text("[Image]", el.x, el.y + 4);
          }
          break;
        }
      }
    }
  });

  return doc;
}

/** Render one paper (single, or one student copy) to a jsPDF document. */
export function buildQuizPaperPdf(input: PaperInput): jsPDF {
  const { date, time } = footerDateTime();
  const models = layoutQuestionPaper(input, date, time);
  return renderModelsToDoc(models);
}

function safe(name: string | undefined): string {
  return (name || "quiz").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

export function downloadSinglePaperPdf(input: PaperInput): void {
  const doc = buildQuizPaperPdf(input);
  doc.save(`${safe(input.meta.quizName)}-question-paper.pdf`);
}

export function downloadIndividualPaperPdfs(input: Omit<PaperInput, "student">, students: PdfStudent[]): void {
  students.forEach((s, idx) => {
    const doc = buildQuizPaperPdf({ ...input, student: s });
    const name = safe(`${input.meta.quizName}-${s.name ?? s.username ?? s.rollNo ?? idx + 1}`);
    doc.save(`${name}.pdf`);
  });
}

/** Build ONE document that repeats the paper for every student, one section per student. */
export function buildCombinedPaperPdf(input: Omit<PaperInput, "student">, students: PdfStudent[]): jsPDF {
  const { date, time } = footerDateTime();
  const list = students.length ? students : [null];
  const models: PdfPageModel[] = [];
  list.forEach((s, idx) => {
    const studentModels = layoutQuestionPaper({ ...input, student: s }, date, time);
    studentModels.forEach((m) => {
      models.push({ ...m, els: [...m.els] });
    });
    if (idx < list.length - 1) {
      models.push({ width: models[0].width, height: models[0].height, els: [] });
    }
  });
  return renderModelsToDoc(models);
}

export function downloadCombinedPaperPdf(input: Omit<PaperInput, "student">, students: PdfStudent[]): void {
  const doc = buildCombinedPaperPdf(input, students);
  doc.save(`${safe(input.meta.quizName)}-combined.pdf`);
}

/** High-level download respecting the generation mode. */
export async function downloadQuizPaperPdf(
  input: PaperInput,
  allStudents?: PdfStudent[]
): Promise<void> {
  const mode = input.config.generation.mode;

  if (mode === "single") {
    downloadSinglePaperPdf(input);
    return;
  }

  const list = (allStudents ?? []).filter((s) =>
    input.config.generation.selectedStudentIds == null ||
    input.config.generation.selectedStudentIds.length === 0
      ? true
      : input.config.generation.selectedStudentIds.includes(s.id)
  );

  if (mode === "individual") {
    downloadIndividualPaperPdfs(input, list);
    return;
  }

  if (mode === "combined") {
    downloadCombinedPaperPdf(input, list);
    return;
  }
}
