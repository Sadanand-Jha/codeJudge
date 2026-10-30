import { getUserTimeZone } from "@/lib/timezone";
import type { HeaderPlacement } from "@/types/letterhead";

// Print-ready question-paper HTML builder shared by the live preview and the
// server-side PDF renderer. Everything here is pure string generation so the
// same output can be shown in an <iframe> preview and printed by headless
// Chromium via the backend /paper-pdf endpoint.

export interface PaperQuestionOption {
  id?: string;
  label?: string;
  content: string;
  isCorrect?: boolean;
  imageUrl?: string;
}

export interface PaperQuestionImage {
  url: string;
  caption?: string;
}

export interface PaperQuestion {
  id?: string | number;
  type?: string;
  title: string;
  options?: PaperQuestionOption[];
  correctAnswer?: string | number | number[];
  marks?: number;
  images?: PaperQuestionImage[];
}

export interface PaperStudent {
  id?: number;
  name?: string;
  username?: string;
  rollNo?: string;
}

export interface PaperMeta {
  title: string;
  creatorName?: string;
  subject?: string;
  course?: string;
  date?: string;
  totalMarks?: number | string;
  totalQuestions?: number | string;
  /** Questions a student must attempt, when different from totalQuestions. */
  attemptQuestions?: number | string;
  duration?: string;
  difficulty?: string;
  /** Human-readable value shown in instructions, e.g. "0.25" or "None". */
  negativeMarking?: string;
  /** Optional paper set label such as "A" or "B". */
  setName?: string;
  instructions?: string;
}

export interface PaperOptions {
  includeAnswerKey?: boolean;
  showStudentBlock?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  /** Draw an answer bubble before each MCQ option label. */
  mcqBubbles?: boolean;
  /** "two-column" lays the questions out in two newspaper-style columns. */
  layout?: "single" | "two-column";
}

export interface PaperBuildInput {
  meta: PaperMeta;
  questions: PaperQuestion[];
  options?: PaperOptions;
  /** Multiple students repeat the paper with filled details blocks (combined mode). */
  students?: PaperStudent[] | null;
  /** Optional custom letterhead placement for page 1 (and repeated pages). */
  header?: HeaderPlacement | null;
}

const CHOICE_TYPES = new Set(["single_choice", "multiple_choice", "true_false"]);

const FONT_FILES = {
  serifRegular: "/fonts/LiberationSerif-Regular.ttf",
  serifBold: "/fonts/LiberationSerif-Bold.ttf",
  serifItalic: "/fonts/LiberationSerif-Italic.ttf",
  serifBoldItalic: "/fonts/LiberationSerif-BoldItalic.ttf",
  devanagari: "/fonts/NotoSansDevanagari-var.ttf",
  mono: "/fonts/LiberationMono-Regular.ttf",
} as const;

export function buildPaperFontCss(fonts: {
  serifRegular: string;
  serifBold: string;
  serifItalic: string;
  serifBoldItalic: string;
  devanagari: string;
  mono: string;
}): string {
  return [
    `@font-face{font-family:'Liberation Serif';src:url(data:font/ttf;base64,${fonts.serifRegular}) format('truetype');font-weight:400;font-style:normal;font-display:block;}`,
    `@font-face{font-family:'Liberation Serif';src:url(data:font/ttf;base64,${fonts.serifBold}) format('truetype');font-weight:700;font-style:normal;font-display:block;}`,
    `@font-face{font-family:'Liberation Serif';src:url(data:font/ttf;base64,${fonts.serifItalic}) format('truetype');font-weight:400;font-style:italic;font-display:block;}`,
    `@font-face{font-family:'Liberation Serif';src:url(data:font/ttf;base64,${fonts.serifBoldItalic}) format('truetype');font-weight:700;font-style:italic;font-display:block;}`,
    `@font-face{font-family:'Paper Devanagari';src:url(data:font/ttf;base64,${fonts.devanagari}) format('truetype');font-weight:100 900;font-style:normal;font-display:block;}`,
    `@font-face{font-family:'Liberation Mono';src:url(data:font/ttf;base64,${fonts.mono}) format('truetype');font-weight:400;font-style:normal;font-display:block;}`,
  ].join("\n");
}

let fontCssPromise: Promise<string> | null = null;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load font: ${url}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Loads the bundled print fonts once, caching the CSS. */
export function loadPaperFontCss(): Promise<string> {
  if (!fontCssPromise) {
    fontCssPromise = Promise.all([
      fetchAsBase64(FONT_FILES.serifRegular),
      fetchAsBase64(FONT_FILES.serifBold),
      fetchAsBase64(FONT_FILES.serifItalic),
      fetchAsBase64(FONT_FILES.serifBoldItalic),
      fetchAsBase64(FONT_FILES.devanagari),
      fetchAsBase64(FONT_FILES.mono),
    ])
      .then(([serifRegular, serifBold, serifItalic, serifBoldItalic, devanagari, mono]) =>
        buildPaperFontCss({ serifRegular, serifBold, serifItalic, serifBoldItalic, devanagari, mono })
      )
      .catch((error) => {
        fontCssPromise = null;
        throw error;
      });
  }
  return fontCssPromise;
}

const esc = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Keep hyphenated compounds together instead of letting the line breaker split them. */
function protectCompounds(html: string): string {
  return html.replace(/([^\s<>]+-[^\s<>]+)/g, '<span class="nw">$1</span>');
}

/** Render caret exponents as real superscripts: 2^128 → 2<sup>128</sup>. */
function renderExponents(html: string): string {
  return html.replace(/(\d+(?:\.\d+)?)\^(\d+)/g, "$1<sup>$2</sup>");
}

function normalizeInline(html: string): string {
  const normalized = html
    .replace(/<(\/?)(b|strong|i|em|u|sub|sup|code)(?:\s[^>]*)?>/gi, "<$1$2>")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<(?!\/?(?:b|strong|i|em|u|sub|sup|code)>)/g, "&lt;")
    .replace(/&(?!amp;|lt;|gt;|nbsp;|quot;|#\d+;)/g, "&amp;");
  return protectCompounds(renderExponents(normalized));
}

interface CodeSegment {
  kind: "code";
  text: string;
}
interface TableSegment {
  kind: "table";
  head: string[] | null;
  rows: string[][];
}
interface TextSegment {
  kind: "text";
  lines: string[];
}
type RichSegment = CodeSegment | TableSegment | TextSegment;

function splitFences(raw: string): Array<{ kind: "text" | "code"; text: string }> {
  const parts: Array<{ kind: "text" | "code"; text: string }> = [];
  const fence = /```[^\n`]*\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(raw))) {
    if (match.index > last) parts.push({ kind: "text", text: raw.slice(last, match.index) });
    parts.push({ kind: "code", text: match[1].replace(/\n$/, "") });
    last = match.index + match[0].length;
  }
  if (last < raw.length) parts.push({ kind: "text", text: raw.slice(last) });
  return parts;
}

function cellToInline(html: string): string {
  return normalizeInline(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])\s*>/gi, " ")
  ).replace(/\s+/g, " ").trim();
}

function parseTable(block: string): TableSegment | null {
  const rows: Array<{ cells: string[]; headerCells: number }> = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(block))) {
    const cells: string[] = [];
    let headerCells = 0;
    const cellRe = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      if (cellMatch[1].toLowerCase() === "th") headerCells += 1;
      cells.push(cellToInline(cellMatch[2]));
    }
    if (cells.length) rows.push({ cells, headerCells });
  }
  if (!rows.length) return null;
  const first = rows[0];
  const head = first.headerCells === first.cells.length ? first.cells : null;
  return { kind: "table", head, rows: (head ? rows.slice(1) : rows).map((r) => r.cells) };
}

function textToLines(chunk: string): string[] {
  const isHtml = /<[a-z][^>]*>/i.test(chunk);
  if (!isHtml) {
    return chunk
      .split(/\r?\n/)
      .map((line) => normalizeInline(esc(line)))
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const withBreaks = chunk
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\s*(p|div|h[1-6]|ul|ol|blockquote|tr)[^>]*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|blockquote|tr)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  return withBreaks
    .split(/\n/)
    .map((line) => normalizeInline(line).trim())
    .filter(Boolean);
}

function decodeCodeText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&");
}

function pushTextSegments(text: string, segments: RichSegment[]): void {
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  let cursor = 0;
  while ((tableMatch = tableRe.exec(text))) {
    if (tableMatch.index > cursor) {
      const lines = textToLines(text.slice(cursor, tableMatch.index));
      if (lines.length) segments.push({ kind: "text", lines });
    }
    const table = parseTable(tableMatch[0]);
    if (table) segments.push(table);
    cursor = tableMatch.index + tableMatch[0].length;
  }
  if (cursor < text.length) {
    const lines = textToLines(text.slice(cursor));
    if (lines.length) segments.push({ kind: "text", lines });
  }
}

function richToSegments(raw: string | undefined | null): RichSegment[] {
  if (!raw || !raw.trim()) return [];
  const segments: RichSegment[] = [];
  for (const part of splitFences(raw)) {
    if (part.kind === "code") {
      if (part.text.trim()) segments.push({ kind: "code", text: part.text });
      continue;
    }
    const preRe = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
    let preMatch: RegExpExecArray | null;
    let last = 0;
    while ((preMatch = preRe.exec(part.text))) {
      if (preMatch.index > last) pushTextSegments(part.text.slice(last, preMatch.index), segments);
      const code = decodeCodeText(preMatch[1]).replace(/\n$/, "");
      if (code.trim()) segments.push({ kind: "code", text: code });
      last = preMatch.index + preMatch[0].length;
    }
    if (last < part.text.length) pushTextSegments(part.text.slice(last), segments);
  }
  return segments;
}

function renderSegments(segments: RichSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.kind === "code") return `<pre class="code">${esc(segment.text)}</pre>`;
      if (segment.kind === "table") {
        const head = segment.head
          ? `<thead><tr>${segment.head.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`
          : "";
        const rows = segment.rows
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
          .join("");
        return `<div class="tblwrap"><table class="tbl">${head}<tbody>${rows}</tbody></table></div>`;
      }
      return segment.lines.map((line) => `<p class="ln">${line}</p>`).join("");
    })
    .join("");
}

function renderOptions(question: PaperQuestion, optionsConfig: PaperOptions, twoColumns: boolean): string {
  const options = (question.options ?? []).filter((o) => o.content?.trim() || o.imageUrl);
  if (options.length < 2) return "";
  if (question.type && !CHOICE_TYPES.has(question.type)) return "";

  const hasImages = options.some((option) => option.imageUrl);
  // The browser measurement pass makes the final 4 -> 2 -> 1 decision. This
  // initial class keeps the live preview useful before that pass runs.
  const initialLayout =
    hasImages || options.length > 4
      ? "opts-1"
      : options.length === 4 && !twoColumns
        ? "opts-4"
        : "opts-2";

  const items = options
    .map((option, index) => {
      const label = `(${String.fromCharCode(65 + index)})`;
      const bubble = optionsConfig.mcqBubbles ? `<span class="bubble" aria-hidden="true">○</span>` : "";
      const body = option.content?.trim() ? normalizeInline(option.content) : "";
      const image = option.imageUrl ? `<img src="${esc(option.imageUrl)}" alt="">` : "";
      const content = body || image || `<span class="muted">[Image]</span>`;
      return `<div class="opt"><span class="opt-label">${bubble}${label}</span><span class="opt-text">${content}</span></div>`;
    })
    .join("");
  return `<div class="opts ${initialLayout}" data-options data-count="${options.length}"${hasImages ? ' data-has-images="true"' : ""}>${items}</div>`;
}

function renderQuestionImages(question: PaperQuestion): string {
  const images = (question.images ?? []).filter((img) => img?.url);
  if (!images.length) return "";
  return images
    .map(
      (img) =>
        `<div class="qimg"><img src="${esc(img.url)}" alt="">${
          img.caption ? `<div class="cap">${esc(img.caption)}</div>` : ""
        }</div>`
    )
    .join("");
}

export function correctAnswerText(question: PaperQuestion): string {
  const options = question.options ?? [];
  const correctIndexes = options
    .map((option, index) => (option.isCorrect ? index : -1))
    .filter((index) => index >= 0);
  if (correctIndexes.length && options.length >= 2) {
    return correctIndexes.map((i) => `(${String.fromCharCode(65 + i)})`).join(", ");
  }
  const raw = question.correctAnswer;
  if (Array.isArray(raw)) {
    if (!raw.length) return "—";
    const numeric = raw.every((n) => typeof n === "number");
    const asIndexes = numeric && options.length >= 2 && raw.every((n) => (n as number) >= 0 && (n as number) < options.length);
    if (asIndexes) {
      return raw.map((n) => `(${String.fromCharCode(65 + (n as number))})`).join(", ");
    }
    return raw.map((v) => String(v)).join(", ");
  }
  if (raw === undefined || raw === null || String(raw).trim() === "" || raw === -1) {
    if (options.length === 1 && options[0].content?.trim()) return options[0].content.trim();
    return "—";
  }
  const value = String(raw).trim();
  if (/^[a-z](\s*,\s*[a-z])*$/i.test(value) && options.length >= 2) {
    return value
      .split(",")
      .map((letter) => `(${letter.trim().toUpperCase()})`)
      .join(", ");
  }
  if (options.length >= 2) {
    const byLabel = options.findIndex((o) => (o.label ?? "").trim().toLowerCase() === value.toLowerCase());
    if (byLabel >= 0) return `(${String.fromCharCode(65 + byLabel)})`;
  }
  if (options.length === 1 && options[0].content?.trim()) return options[0].content.trim();
  return value.length > 160 ? `${value.slice(0, 157)}…` : value;
}

function formatMarks(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function renderQuestion(question: PaperQuestion, index: number, options: PaperOptions, twoColumns: boolean): string {
  const body = renderSegments(richToSegments(question.title));
  const marks =
    typeof question.marks === "number" && question.marks > 0
      ? `<span class="q-marks">[${formatMarks(question.marks)}]</span>`
      : "";
  return `<article class="question" data-question="${index + 1}">
  <span class="q-no">${index + 1}.</span>
  ${marks}
  <div class="q-text">${body}</div>
  ${renderOptions(question, options, twoColumns)}
  ${renderQuestionImages(question)}
</article>`;
}

function renderMetaGrid(meta: PaperMeta): string {
  const cells: Array<[string, string]> = [];
  if (meta.subject?.trim()) cells.push(["Subject", meta.subject.trim()]);
  if (meta.date?.trim()) cells.push(["Date", meta.date.trim()]);
  if (meta.duration?.trim()) cells.push(["Duration", meta.duration.trim()]);
  if (meta.totalMarks !== undefined && String(meta.totalMarks).trim()) {
    cells.push(["Maximum Marks", String(meta.totalMarks).trim()]);
  }
  if (meta.setName?.trim()) cells.push(["Set", meta.setName.trim()]);
  if (!cells.length) return "";
  return `<div class="meta">${cells
    .map(([label, value]) => `<div class="cell"><span class="lbl">${esc(label)}:</span><span class="val">${esc(value)}</span></div>`)
    .join("")}</div>`;
}

function renderStudentBlock(meta: PaperMeta, options: PaperOptions, student: PaperStudent | null): string {
  if (options.showStudentBlock === false) return "";
  const name = student?.name?.trim() ?? "";
  const roll = (student?.rollNo || student?.username || "").trim();
  return `<div class="student">
  <span class="f">Name: <span class="fill">${esc(name)}</span></span>
  <span class="f">Roll No.: <span class="fill">${esc(roll)}</span></span>
</div>`;
}

function isChoiceQuestion(question: PaperQuestion): boolean {
  if (question.type) return CHOICE_TYPES.has(question.type);
  return (question.options?.length ?? 0) >= 2;
}

function isDescriptiveQuestion(question: PaperQuestion): boolean {
  if (question.type) return !CHOICE_TYPES.has(question.type);
  return (question.options?.length ?? 0) < 2;
}

function positiveInteger(value: number | string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

export function paperInstructionLines(meta: PaperMeta, questions: PaperQuestion[]): string[] {
  const total = questions.length;
  const attempt = positiveInteger(meta.attemptQuestions);
  const negative = meta.negativeMarking?.trim() ?? "None";
  const hasChoice = questions.some(isChoiceQuestion);
  const hasDescriptive = questions.some(isDescriptiveQuestion);

  const lines = [`Total questions: ${total}.`];
  if (attempt !== null && attempt !== total) lines.push(`Questions to attempt: ${attempt}.`);
  if (attempt === null || attempt === total) lines.push("All questions are compulsory.");
  if (hasChoice) lines.push("Circle or tick the correct option.");
  if (hasDescriptive) lines.push("Write your answers in the answer book.");
  if (negative.toLocaleLowerCase() !== "none") lines.push(`Negative marking: ${negative}.`);
  return lines;
}

export function customInstructionLines(value?: string): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+\s*[.):-]\s*|[-•*]\s*)/, "").trim())
    .filter(Boolean);
}

function instructionKey(line: string): string {
  return line
    .toLocaleLowerCase()
    .replace(/[.!;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInstructions(meta: PaperMeta, questions: PaperQuestion[]): string {
  const required = paperInstructionLines(meta, questions);
  const custom = customInstructionLines(meta.instructions);
  const seen = new Set<string>();
  const lines = [...required, ...custom].filter((line) => {
    const key = instructionKey(line);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return `<div class="instr">
  <div class="instr-title">General instructions</div>
  <ol>${lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ol>
</div>`;
}

function renderAnswerKey(meta: PaperMeta, questions: PaperQuestion[]): string {
  const rows = questions
    .map((question, index) => `<tr><td class="num">${index + 1}</td><td>${esc(correctAnswerText(question))}</td></tr>`)
    .join("");
  return `<section class="keypage">
  <div class="keytitle">For examiner use only</div>
  <div class="keymeta">${esc(meta.title)} — Answer Key</div>
  <table class="key">
    <thead><tr><th class="num">Q. No</th><th>Correct Answer</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function sectionTitle(questions: PaperQuestion[]): string {
  if (questions.length > 0 && questions.every((question) => question.type && CHOICE_TYPES.has(question.type))) {
    return "Multiple Choice Questions";
  }
  return "Questions";
}

function renderHeaderImage(header: HeaderPlacement, mode: "print" | "preview"): string {
  const isRepeatedPrint = mode === "print" && header.repeatOnAllPages;
  const x = isRepeatedPrint ? header.rect.x : mode === "print" ? header.rect.x - 15 : header.rect.x;
  const y = isRepeatedPrint ? header.rect.y : mode === "print" ? header.rect.y - 15 : header.rect.y;
  const style = [
    `left:${x}mm`,
    `top:${y}mm`,
    `width:${header.rect.w}mm`,
    `height:${header.rect.h}mm`,
    isRepeatedPrint ? "position:fixed" : "position:absolute",
  ].join(";");
  return `<img class="lh ${isRepeatedPrint ? "lh-repeat" : "lh-first"}" src="${esc(header.dataUrl)}" alt="" style="${style}">`;
}

function headerSpacer(header: HeaderPlacement, mode: "print" | "preview"): number {
  const gap = header.gapMm ?? 8;
  if (mode === "print" && header.repeatOnAllPages) return 0;
  const target = header.rect.bottom + gap;
  return mode === "print" ? Math.max(0, target - 15) : target;
}

function renderPaperSection(meta: PaperMeta, questions: PaperQuestion[], options: PaperOptions, student: PaperStudent | null, header: HeaderPlacement | null, isFirst: boolean, mode: "print" | "preview"): string {
  const twoColumns = options.layout === "two-column";
  const activeHeader = isFirst ? header : null;
  const spacer = activeHeader ? headerSpacer(activeHeader, mode) : 0;
  const headerImage = activeHeader ? renderHeaderImage(activeHeader, mode) : "";
  const sectionMarks = questions.reduce(
    (sum, question) => sum + (typeof question.marks === "number" && question.marks > 0 ? question.marks : 0),
    0
  );
  const paperHead = `<header class="phead">
  ${meta.creatorName?.trim() ? `<div class="creator">${esc(meta.creatorName.trim())}</div>` : ""}
  <h1 class="ptitle">${esc(meta.title || "Question Paper")}</h1>
  ${meta.course?.trim() ? `<p class="psubtitle">${esc(meta.course.trim())}</p>` : ""}
  ${renderMetaGrid(meta)}
  ${renderStudentBlock(meta, options, student)}
  <div class="rule"></div>
</header>
${renderInstructions(meta, questions)}
<div class="section-head">
  <span>Section A — ${esc(sectionTitle(questions))}</span>
  ${sectionMarks > 0 ? `<span class="section-marks">${formatMarks(sectionMarks)} marks</span>` : ""}
</div>`;
  const body = questions
    .map((question, index) => renderQuestion(question, index, options, twoColumns))
    .join("");
  return `<section class="paper${activeHeader ? " has-lh" : ""}">${headerImage}${activeHeader ? `<div class="lh-space" style="height:${spacer}mm"></div>` : ""}${paperHead}<main class="qs${twoColumns ? " two" : ""}">${body}</main><div class="end">End of question paper</div></section>`;
}

export function buildPaperBody(input: PaperBuildInput, mode: "print" | "preview" = "print"): string {
  const { meta, questions, options = {}, students, header } = input;
  const list: Array<PaperStudent | null> = students && students.length ? students : [null];
  const sections = list
    .map((student, index) => {
      const section = renderPaperSection(meta, questions, options, student, header ?? null, index === 0, mode);
      return index === 0 ? section : `<div class="pgbreak"></div>${section}`;
    })
    .join("");
  const key = options.includeAnswerKey ? renderAnswerKey(meta, questions) : "";
  return `${sections}${key}`;
}

export function buildAnswerKeyBody(input: { meta: PaperMeta; questions: PaperQuestion[] }): string {
  return renderAnswerKey(input.meta, input.questions);
}

const PAPER_CSS = `
@page { size: A4; margin: 15mm 15mm 18mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Liberation Serif', 'Paper Devanagari', serif;
  font-size: 10.5pt;
  line-height: 1.25;
  color: #000;
  background: #fff;
  text-align: left;
  word-break: normal;
  overflow-wrap: normal;
  hyphens: manual;
}
p { margin: 0; }
.paper { position: relative; }
.paper.has-lh { padding-top: 0; }
.lh { display: block; object-fit: fill; z-index: 1; }
.lh-space { width: 100%; }
.creator { margin: 0 0 1.5mm; font-size: 10pt; font-weight: 700; text-align: center; text-transform: uppercase; }
.ptitle { margin: 0 0 1mm; font-size: 15pt; line-height: 1.15; font-weight: 700; text-align: center; }
.psubtitle { margin: 0 0 2.5mm; font-size: 10pt; line-height: 1.2; text-align: center; }
.meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1mm 5mm; margin: 2mm 0 2.5mm; font-size: 10pt; }
.meta .cell { display: flex; gap: 1.2mm; min-width: 0; }
.meta .lbl { flex: none; font-weight: 700; white-space: nowrap; }
.meta .val { min-width: 0; overflow-wrap: normal; }
.rule { margin: 0 0 2.5mm; border-top: 0.75pt solid #000; }
.student { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin: 0 0 2.5mm; font-size: 10pt; }
.student .f { display: flex; align-items: baseline; gap: 1.5mm; min-width: 0; }
.student .fill { flex: 1; min-width: 22mm; min-height: 1.3em; padding: 0 1mm 0.4mm; border-bottom: 0.5pt solid #000; }
.instr { margin: 0 0 3.5mm; padding: 2mm 2.5mm; border: 0.5pt solid #000; font-size: 10pt; line-height: 1.25; break-inside: avoid; }
.instr-title { margin: 0 0 1mm; font-size: 9pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.instr ol { margin: 0; padding-left: 5mm; }
.instr li { margin: 0 0 0.4mm; }
.instr li:last-child { margin-bottom: 0; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 4mm; margin: 0 0 3mm; padding: 1mm 0; border-top: 0.75pt solid #000; border-bottom: 0.75pt solid #000; font-size: 10.5pt; font-weight: 700; break-after: avoid; }
.section-marks { flex: none; font-size: 10pt; white-space: nowrap; }
.qs { margin: 0; }
.qs.two { column-count: 2; column-gap: 8mm; column-rule: 0.5pt solid #000; column-fill: balance; }
.question { position: relative; margin: 0 0 3mm; padding-left: 9mm; break-inside: avoid; }
.question:last-child { margin-bottom: 0; }
.q-no { position: absolute; top: 0; left: 0; font-weight: 700; }
.q-marks { position: absolute; top: 0; right: 0; font-size: 10pt; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.q-text { min-width: 0; padding-right: 9mm; word-break: normal; overflow-wrap: normal; hyphens: manual; }
.q-text .ln { margin: 0 0 1mm; }
.q-text .ln:last-child { margin-bottom: 0; }
.opts { display: grid; column-gap: 4mm; row-gap: 1mm; margin-top: 1.2mm; }
.opts-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.opts-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.opts-1 { grid-template-columns: minmax(0, 1fr); }
.opt { display: grid; grid-template-columns: 7mm minmax(0, 1fr); align-items: start; min-width: 0; font-size: 10pt; line-height: 1.25; break-inside: avoid; word-break: normal; overflow-wrap: normal; hyphens: manual; }
.opt-label { white-space: nowrap; }
.opt-label .bubble { display: inline-block; width: 3.2mm; }
.opt-text { min-width: 0; word-break: normal; overflow-wrap: normal; hyphens: manual; }
.opt img { max-width: 100%; height: auto; margin-top: 1mm; }
.nw { white-space: nowrap; }
sup, sub { font-size: 66%; line-height: 0; }
sup { vertical-align: super; }
sub { vertical-align: sub; }
.muted { font-style: italic; }
pre.code { margin: 1.5mm 0 0; padding: 1.5mm 2mm; border: 0.5pt solid #000; font-family: 'Liberation Mono', monospace; font-size: 10pt; line-height: 1.25; white-space: pre-wrap; overflow-wrap: normal; break-inside: avoid; }
.qs.two pre.code { font-size: 9.5pt; }
.tblwrap { margin: 1.5mm 0 0; break-inside: avoid; }
table.tbl { width: 100%; border-collapse: collapse; font-size: 10pt; }
.qs.two table.tbl { table-layout: fixed; }
table.tbl th, table.tbl td { padding: 1mm 1.5mm; border: 0.5pt solid #000; text-align: left; vertical-align: top; overflow-wrap: normal; }
table.tbl th { font-weight: 700; }
.qimg { margin: 3mm 0 0; text-align: center; break-inside: avoid; }
.qimg img { max-width: 100%; height: auto; }
.qimg .cap { margin-top: 1mm; font-size: 9.5pt; font-style: italic; }
.end { margin: 4mm 0 0; font-size: 9.5pt; font-style: italic; text-align: center; break-before: avoid; }
.pgbreak { break-before: page; }
.keypage { break-before: page; }
.keytitle { margin: 0 0 1mm; font-size: 14pt; font-weight: 700; text-align: center; }
.keymeta { margin: 0 0 4mm; font-size: 10pt; text-align: center; }
table.key { width: 100%; border-collapse: collapse; font-size: 10pt; }
table.key th, table.key td { padding: 1.5mm 2.5mm; border: 0.5pt solid #000; text-align: left; vertical-align: middle; }
table.key thead th { font-weight: 700; }
table.key .num { width: 16mm; }
`;

const PREVIEW_CSS = `
body { background: #fff; }
.paper { width: 210mm; margin: 0 auto; padding: 15mm 15mm 18mm; background: #fff; position: relative; }
.paper.has-lh { padding-top: 0; }
.lh { display: block; object-fit: fill; z-index: 1; }
.lh-space { width: 100%; }
.pgbreak, .keypage { break-before: auto; }
.pgbreak { height: 8mm; }
.pgbreak + .paper { border-top: 0.5pt dashed #999; padding-top: 16mm; }
.keypage { margin-top: 12mm; padding-top: 12mm; border-top: 0.5pt dashed #999; }
`;

export function buildPaperDocument(input: PaperBuildInput, fontCss: string): string {
  const header = input.header ?? null;
  const pageCss = header?.repeatOnAllPages
    ? `@page { margin-top: ${Math.max(15, header.rect.bottom + (header.gapMm ?? 8))}mm; }`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(input.meta.title || "Question Paper")}</title><meta name="author" content="QuizSupport"><style>${fontCss}${PAPER_CSS}${pageCss}</style></head><body>${buildPaperBody(input, "print")}</body></html>`;
}

export function buildAnswerKeyDocument(input: { meta: PaperMeta; questions: PaperQuestion[] }, fontCss: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(input.meta.title || "Question Paper")} — Answer Key</title><meta name="author" content="QuizSupport"><style>${fontCss}${PAPER_CSS}</style></head><body>${buildAnswerKeyBody(input)}</body></html>`;
}

export function buildPaperPreviewDocument(
  input: PaperBuildInput | { meta: PaperMeta; questions: PaperQuestion[] },
  fontCss: string,
  mode: "paper" | "key"
): string {
  const body =
    mode === "key"
      ? buildAnswerKeyBody(input as { meta: PaperMeta; questions: PaperQuestion[] })
      : buildPaperBody(input as PaperBuildInput, "preview");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${fontCss}${PAPER_CSS}${PREVIEW_CSS}</style></head><body>${body}</body></html>`;
}

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Applies generation-time shuffling once so preview and PDF match the same order. */
export function preparePaperQuestions(questions: PaperQuestion[], options: PaperOptions = {}): PaperQuestion[] {
  let list = questions.slice();
  if (options.shuffleQuestions) list = shuffle(list);
  if (options.shuffleOptions) {
    list = list.map((question) =>
      question.options && question.options.length > 1 ? { ...question, options: shuffle(question.options) } : question
    );
  }
  return list;
}

export function paperFooterLeft(meta: PaperMeta): string {
  return meta.title?.trim() || meta.subject?.trim() || "Question Paper";
}

export function formatPaperDate(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: getUserTimeZone(),
  });
}
