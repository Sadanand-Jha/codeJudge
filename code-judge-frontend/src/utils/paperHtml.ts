import { getUserTimeZone } from "@/lib/timezone";

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
  /** "two-column" lays the questions out in two newspaper-style columns. */
  layout?: "single" | "two-column";
}

export interface PaperBuildInput {
  meta: PaperMeta;
  questions: PaperQuestion[];
  options?: PaperOptions;
  /** Multiple students repeat the paper with filled details blocks (combined mode). */
  students?: PaperStudent[] | null;
}

const CHOICE_TYPES = new Set(["single_choice", "multiple_choice", "true_false"]);

const FONT_FILES = {
  sans: "/fonts/NotoSans-var.ttf",
  devanagari: "/fonts/NotoSansDevanagari-var.ttf",
  mono: "/fonts/NotoSansMono-var.ttf",
} as const;

const PAPER_LOGO_FILE = "/logos/name.png";

export function buildPaperFontCss(fonts: {
  sans: string;
  devanagari: string;
  mono: string;
}): string {
  return [
    `@font-face{font-family:'Noto Sans';src:url(data:font/ttf;base64,${fonts.sans}) format('truetype');font-weight:100 900;font-style:normal;font-display:block;}`,
    `@font-face{font-family:'Noto Sans Devanagari';src:url(data:font/ttf;base64,${fonts.devanagari}) format('truetype');font-weight:100 900;font-style:normal;font-display:block;}`,
    `@font-face{font-family:'Noto Sans Mono';src:url(data:font/ttf;base64,${fonts.mono}) format('truetype');font-weight:100 900;font-style:normal;font-display:block;}`,
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

/** Loads the bundled Noto fonts and brand logo once, caching the CSS. */
export function loadPaperFontCss(): Promise<string> {
  if (!fontCssPromise) {
    fontCssPromise = Promise.all([
      fetchAsBase64(FONT_FILES.sans),
      fetchAsBase64(FONT_FILES.devanagari),
      fetchAsBase64(FONT_FILES.mono),
      fetchAsBase64(PAPER_LOGO_FILE).catch(() => ""),
    ])
      .then(([sans, devanagari, mono, logo]) => {
        const brandCss = logo
          ? `\n.brand-logo{display:block;width:22mm;height:4.5mm;background:url(data:image/png;base64,${logo}) center/contain no-repeat;}`
          : "";
        return `${buildPaperFontCss({ sans, devanagari, mono })}${brandCss}`;
      })
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

function normalizeInline(html: string): string {
  return html
    .replace(/<(\/?)(b|strong|i|em|u|sub|sup|code)(?:\s[^>]*)?>/gi, "<$1$2>")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<(?!\/?(?:b|strong|i|em|u|sub|sup|code)>)/g, "&lt;")
    .replace(/&(?!amp;|lt;|gt;|nbsp;|quot;|#\d+;)/g, "&amp;");
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

function plainLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim().length;
}

function renderOptions(question: PaperQuestion, twoColumns: boolean): string {
  const options = (question.options ?? []).filter((o) => o.content?.trim() || o.imageUrl);
  if (options.length < 2) return "";
  if (question.type && !CHOICE_TYPES.has(question.type)) return "";
  const lengths = options.map((option) => plainLength(option.content ?? ""));
  const hasImages = options.some((option) => option.imageUrl);
  const fourColumns =
    !twoColumns && !hasImages && options.length === 4 && lengths.every((length) => length > 0 && length < 25);
  const twoCols = !hasImages && lengths.every((length) => length > 0 && length < 45);
  const items = options
    .map((option, index) => {
      const label = `(${String.fromCharCode(65 + index)})`;
      const body = option.content?.trim() ? normalizeInline(option.content) : "";
      const image = option.imageUrl ? `<img src="${esc(option.imageUrl)}" alt="">` : "";
      const content = body || image || `<span class="muted">[Image]</span>`;
      return `<div class="opt"><span class="ol">${label}</span><span class="oc">${content}</span></div>`;
    })
    .join("");
  return `<div class="opts${fourColumns ? " four" : twoCols ? " two" : ""}">${items}</div>`;
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

function renderQuestion(question: PaperQuestion, index: number, twoColumns: boolean): string {
  const body = renderSegments(richToSegments(question.title));
  return `<div class="q">
  <div class="qn">Q${index + 1}</div>
  <div class="qb">${body}${renderOptions(question, twoColumns)}${renderQuestionImages(question)}</div>
</div>`;
}

function renderMetaGrid(meta: PaperMeta): string {
  const cells: Array<[string, string]> = [];
  if (meta.subject?.trim()) cells.push(["Subject", meta.subject.trim()]);
  if (meta.course?.trim()) cells.push(["Class / Semester", meta.course.trim()]);
  if (meta.date?.trim()) cells.push(["Date", meta.date.trim()]);
  if (meta.duration?.trim()) cells.push(["Time allowed", meta.duration.trim()]);
  if (meta.setName?.trim()) cells.push(["Set", meta.setName.trim()]);
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

export function paperInstructionLines(meta: PaperMeta, questions: PaperQuestion[]): string[] {
  const negative = meta.negativeMarking && meta.negativeMarking.trim() ? meta.negativeMarking.trim() : "None";
  const total = questions.length;
  const hasChoice = questions.some((question) => !question.type || CHOICE_TYPES.has(question.type));
  return [
    `Total questions: ${total}. Questions to attempt: ${total}.`,
    "All questions are compulsory.",
    ...(hasChoice ? ["Choose the most appropriate option for each multiple-choice question."] : []),
    ...(negative.toLocaleLowerCase() !== "none" ? [`Negative marking: ${negative}.`] : []),
    "Write your answers in the answer book unless instructed otherwise.",
  ].slice(0, 6);
}

export function customInstructionLines(value?: string): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+\s*[.):-]\s*|[-•*]\s*)/, "").trim())
    .filter(Boolean);
}

function renderInstructions(meta: PaperMeta, questions: PaperQuestion[]): string {
  const custom = customInstructionLines(meta.instructions);
  const lines = custom.length ? custom : paperInstructionLines(meta, questions);
  return `<div class="instr">
  <div class="ititle">General instructions</div>
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

function renderPaperSection(meta: PaperMeta, questions: PaperQuestion[], options: PaperOptions, student: PaperStudent | null): string {
  const twoColumns = options.layout === "two-column";
  const header = `<header class="phead">
  ${meta.creatorName?.trim() ? `<div class="inst">${esc(meta.creatorName.trim())}</div>` : ""}
  <h1 class="ptitle">${esc(meta.title || "Question Paper")}</h1>
  ${renderMetaGrid(meta)}
  ${renderStudentBlock(meta, options, student)}
  <div class="rule"></div>
</header>
${renderInstructions(meta, questions)}
<div class="banner"><span><span class="bl">Section A</span> — ${esc(sectionTitle(questions))}</span></div>
<p class="secinstr">All questions are compulsory.</p>`;
  const body = questions.map((question, index) => renderQuestion(question, index, twoColumns)).join("");
  return `<section class="paper">${header}<main class="qs${twoColumns ? " two" : ""}">${body}</main><div class="end">End of question paper</div><div class="brand"><span class="brand-logo" role="img" aria-label="QuizSupport"></span></div></section>`;
}

export function buildPaperBody(input: PaperBuildInput): string {
  const { meta, questions, options = {}, students } = input;
  const list: Array<PaperStudent | null> = students && students.length ? students : [null];
  const sections = list
    .map((student, index) => {
      const section = renderPaperSection(meta, questions, options, student);
      return index === 0 ? section : `<section class="pgbreak"></section>${section}`;
    })
    .join("");
  const key = options.includeAnswerKey ? renderAnswerKey(meta, questions) : "";
  return `${sections}${key}`;
}

export function buildAnswerKeyBody(input: { meta: PaperMeta; questions: PaperQuestion[] }): string {
  return renderAnswerKey(input.meta, input.questions);
}

const PAPER_CSS = `
@page { size: A4; margin: 20mm 20mm 22mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Times New Roman', 'Liberation Serif', Times, serif;
  font-size: 12pt;
  line-height: 1.15;
  color: #000;
  background: #fff;
  text-align: justify;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.inst { font-size: 16pt; font-weight: 700; text-transform: uppercase; text-align: center; margin: 0 0 1.5mm; }
.ptitle { font-size: 14pt; font-weight: 700; text-align: center; margin: 0 0 3mm; }
.meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.2mm 6mm; font-size: 11pt; text-align: left; margin: 0 0 3mm; }
.meta .cell { display: flex; gap: 1.2mm; min-width: 0; }
.meta .lbl { font-weight: 700; white-space: nowrap; }
.meta .val { font-weight: 400; min-width: 0; overflow-wrap: anywhere; }
.rule { border-top: 1.5pt solid #000; margin: 0 0 3mm; }
.student { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; font-size: 11pt; text-align: left; margin: 0 0 2.5mm; }
.student .f { display: flex; align-items: baseline; gap: 1mm; min-width: 0; }
.student .fill { flex: 1; min-width: 30mm; border-bottom: 0.75pt solid #000; padding: 0 1mm 0.5mm; min-height: 1.2em; }
.instr { border: 1pt solid #000; background: #F2F2F2; padding: 2.5mm 3mm; font-size: 10.5pt; line-height: 1.3; break-inside: avoid; margin: 0 0 4mm; }
.instr .ititle { font-weight: 700; margin: 0 0 1mm; }
.instr ol { margin: 0; padding-left: 5mm; }
.instr li { margin: 0 0 0.7mm; }
.banner { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 4mm; background: #F2F2F2; border-top: 1pt solid #000; border-bottom: 1pt solid #000; padding: 1.5mm 2.5mm; font-size: 12pt; font-weight: 700; text-align: left; break-after: avoid; }
.banner .bl { text-transform: uppercase; }
.secinstr { font-size: 10.5pt; font-style: italic; color: #555; margin: 2mm 0 1mm; break-after: avoid; }
.qs { margin: 0; }
.qs.two { column-count: 2; column-gap: 8mm; column-rule: 0.5pt solid #BBB; }
@media print { .qs.two { column-fill: auto; } }
.q { display: grid; grid-template-columns: 12mm minmax(0, 1fr); column-gap: 2mm; margin: 4mm 0 0; break-inside: avoid; }
.q:first-child { margin-top: 0; }
.q .qn { font-size: 12pt; font-weight: 700; text-align: left; padding-top: 0.2mm; }
.q .qb { font-size: 12pt; font-weight: 400; min-width: 0; overflow-wrap: break-word; }
.q .qb p { margin: 0 0 1.5mm; }
.q .qb p:last-child { margin-bottom: 0; }
.opts { margin: 1.5mm 0 0 6mm; display: grid; gap: 1mm; }
.opts.four { grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 4mm; }
.opts.two { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 6mm; }
.opt { display: grid; grid-template-columns: 6mm minmax(0, 1fr); column-gap: 1.5mm; font-size: 11pt; font-weight: 400; line-height: 1.25; }
.opt .ol { font-weight: 400; text-align: left; }
.opt .oc { min-width: 0; overflow-wrap: break-word; }
.opt img { max-width: 100%; height: auto; margin-top: 1mm; }
.muted { color: #555; font-style: italic; }
pre.code { font-family: 'Courier New', 'Liberation Mono', Consolas, monospace; font-size: 10.5pt; font-weight: 400; background: #F5F5F5; border: 0.5pt solid #999; padding: 1.5mm 2mm; margin: 1.5mm 0 0; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; line-height: 1.25; }
.qs.two pre.code { font-size: 9.5pt; }
.tblwrap { margin: 1.5mm 0 0; break-inside: avoid; }
table.tbl { border-collapse: collapse; width: 100%; font-size: 10.5pt; font-weight: 400; }
.qs.two table.tbl { font-size: 10pt; table-layout: fixed; }
table.tbl th, table.tbl td { border: 0.75pt solid #000; padding: 1mm 1.5mm; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
table.tbl th { font-weight: 700; background: #F2F2F2; }
.qimg { text-align: center; margin: 3mm 0 0; break-inside: avoid; }
.qimg img { max-width: 100%; height: auto; }
.qimg .cap { font-size: 10.5pt; font-style: italic; color: #555; margin-top: 1mm; }
.end { text-align: center; font-size: 10.5pt; font-style: italic; margin: 8mm 0 0; break-before: avoid; }
.brand { display: flex; align-items: center; justify-content: center; margin: 4mm 0 0; break-before: avoid; }
.pgbreak { break-before: page; }
.keypage { break-before: page; }
.keytitle { font-size: 14pt; font-weight: 700; text-align: center; margin: 0 0 1mm; }
.keymeta { font-size: 10.5pt; color: #555; text-align: center; margin: 0 0 4mm; }
table.key { border-collapse: collapse; width: 100%; font-size: 11pt; font-weight: 400; }
table.key th, table.key td { border: 0.75pt solid #000; padding: 1.5mm 2.5mm; text-align: left; vertical-align: middle; }
table.key thead th { background: #F2F2F2; font-weight: 700; }
table.key .num { width: 16mm; }
`;

const PREVIEW_CSS = `
body { background: #E6E6E6; padding: 0; }
.paper { background: #fff; width: 210mm; padding: 20mm; margin: 0 auto; min-height: 297mm; box-shadow: 0 2px 18px rgba(0,0,0,0.18); }
.pgbreak, .keypage { break-before: auto; }
.pgbreak { height: 8mm; }
.pgbreak + .paper { border-top: 0.5pt dashed #BBB; padding-top: 16mm; }
.keypage { border-top: 0.5pt dashed #BBB; margin-top: 12mm; padding-top: 12mm; }
`;

export function buildPaperDocument(input: PaperBuildInput, fontCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(input.meta.title || "Question Paper")}</title><style>${fontCss}${PAPER_CSS}</style></head><body>${buildPaperBody(input)}</body></html>`;
}

export function buildAnswerKeyDocument(input: { meta: PaperMeta; questions: PaperQuestion[] }, fontCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(input.meta.title || "Question Paper")} — Answer Key</title><style>${fontCss}${PAPER_CSS}</style></head><body>${buildAnswerKeyBody(input)}</body></html>`;
}

export function buildPaperPreviewDocument(
  input: PaperBuildInput | { meta: PaperMeta; questions: PaperQuestion[] },
  fontCss: string,
  mode: "paper" | "key"
): string {
  const body =
    mode === "key"
      ? buildAnswerKeyBody(input as { meta: PaperMeta; questions: PaperQuestion[] })
      : buildPaperBody(input as PaperBuildInput);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}${PAPER_CSS}${PREVIEW_CSS}</style></head><body>${body}</body></html>`;
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
