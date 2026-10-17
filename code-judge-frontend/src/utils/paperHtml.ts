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

/** Loads the bundled Noto fonts once and caches the @font-face CSS. */
export function loadPaperFontCss(): Promise<string> {
  if (!fontCssPromise) {
    fontCssPromise = Promise.all([
      fetchAsBase64(FONT_FILES.sans),
      fetchAsBase64(FONT_FILES.devanagari),
      fetchAsBase64(FONT_FILES.mono),
    ])
      .then(([sans, devanagari, mono]) => buildPaperFontCss({ sans, devanagari, mono }))
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
  const maxShort = twoColumns ? 14 : 28;
  const short = options.every((o) => plainLength(o.content) > 0 && plainLength(o.content) < maxShort);
  const twoCol = short && !options.some((o) => o.imageUrl);
  const items = options
    .map((option, index) => {
      const label = `(${String.fromCharCode(65 + index)})`;
      const body = option.content?.trim() ? normalizeInline(option.content) : "";
      const image = option.imageUrl
        ? `<img src="${esc(option.imageUrl)}" alt="">`
        : body
          ? ""
          : `<span class="muted">[Image]</span>`;
      return `<div class="opt"><span class="ol">${label}</span><span class="oc">${body}${image}</span></div>`;
    })
    .join("");
  return `<div class="opts${twoCol ? " two" : ""}">${items}</div>`;
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
  <div class="n">${index + 1}.</div>
  <div class="body">${body}${renderOptions(question, twoColumns)}${renderQuestionImages(question)}</div>
</div>`;
}

function renderMetaGrid(meta: PaperMeta): string {
  const cells: Array<[string, string | undefined]> = [
    ["Subject", meta.subject],
    ["Date", meta.date],
    ["Total Marks", meta.totalMarks === undefined || meta.totalMarks === "" ? undefined : String(meta.totalMarks)],
    ["Duration", meta.duration],
    ["Difficulty", meta.difficulty],
    ["Total Questions", meta.totalQuestions === undefined || meta.totalQuestions === "" ? undefined : String(meta.totalQuestions)],
  ];
  return `<div class="meta">${cells
    .map(
      ([label, value]) =>
        `<div class="cell"><span class="lbl">${esc(label)}</span><span class="val">${value && String(value).trim() ? esc(String(value)) : "&nbsp;"}</span></div>`
    )
    .join("")}</div>`;
}

function renderStudentBlock(meta: PaperMeta, options: PaperOptions, student: PaperStudent | null): string {
  if (options.showStudentBlock === false) return "";
  const name = student?.name?.trim() ?? "";
  const roll = (student?.rollNo || student?.username || "").trim();
  return `<div class="student">
  <span class="f">Name: <span class="fill">${esc(name)}</span></span>
  <span class="f">Roll No: <span class="fill">${esc(roll)}</span></span>
  <span class="f">Section: <span class="fill"></span></span>
</div>`;
}

function renderInstructions(meta: PaperMeta): string {
  const negative = meta.negativeMarking && meta.negativeMarking.trim() ? meta.negativeMarking.trim() : "None";
  const lines = [
    "All questions are compulsory.",
    "Write answers in the space provided against each question.",
    `Negative marking: ${negative}.`,
  ];
  return `<div class="instr">${lines.map((line, index) => `<div>${index + 1}. ${esc(line)}</div>`).join("")}</div>`;
}

function renderAnswerKey(meta: PaperMeta, questions: PaperQuestion[]): string {
  const rows = questions
    .map((question, index) => `<tr><td class="num">${index + 1}</td><td>${esc(correctAnswerText(question))}</td></tr>`)
    .join("");
  return `<section class="keypage">
  <div class="keytitle">Answer Key</div>
  <div class="keymeta">${esc(meta.title)}</div>
  <table class="key">
    <thead><tr><th class="num">Q. No</th><th>Correct Option</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function renderPaperSection(meta: PaperMeta, questions: PaperQuestion[], options: PaperOptions, student: PaperStudent | null): string {
  const twoColumns = options.layout === "two-column";
  const header = `<header class="phead">
  ${meta.creatorName?.trim() ? `<div class="brand">${esc(meta.creatorName.trim())}</div>` : ""}
  <h1 class="ptitle">${esc(meta.title || "Question Paper")}</h1>
  <div class="rule"></div>
  ${renderMetaGrid(meta)}
  ${renderStudentBlock(meta, options, student)}
  ${renderInstructions(meta)}
</header>
<div class="cols-rule"></div>`;
  const body = questions.map((question, index) => renderQuestion(question, index, twoColumns)).join("");
  return `<section class="paper">${header}<main class="qs${twoColumns ? " two" : ""}">${body}</main></section>`;
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
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Noto Sans', 'Noto Sans Devanagari', sans-serif;
  font-size: 10pt;
  line-height: 1.4;
  color: #000;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.brand { font-size: 10pt; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin: 0 0 1.5mm; }
.ptitle { font-size: 17pt; font-weight: 700; text-align: center; margin: 0 0 2.5mm; }
.rule { border-top: 0.75pt solid #000; margin: 0 0 3.5mm; }
.meta { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 4mm; row-gap: 2mm; margin: 0 0 4mm; }
.meta .lbl { display: block; font-size: 8.5pt; font-weight: 500; color: #555; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3mm; }
.meta .val { display: block; font-size: 10.5pt; font-weight: 500; min-height: 1.4em; }
.student { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6mm; font-size: 10.5pt; margin: 0 0 4mm; }
.student .f { display: flex; align-items: baseline; gap: 1.5mm; min-width: 0; }
.student .fill { flex: 1; min-width: 0; border-bottom: 0.5pt solid #000; padding: 0 1mm 0.7mm; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.instr { border: 0.5pt solid #BBB; padding: 3mm; font-size: 9pt; }
.instr div { margin-bottom: 0.8mm; }
.instr div:last-child { margin-bottom: 0; }
.cols-rule { border-top: 0.75pt solid #000; margin: 4mm 0 1.5mm; }
.qs { margin: 0; }
.qs.two { column-count: 2; column-gap: 8mm; column-rule: 0.5pt solid #BBB; }
@media print { .qs.two { column-fill: auto; } }
.q { display: grid; grid-template-columns: 7mm minmax(0, 1fr); column-gap: 0; margin: 0 0 5mm; break-inside: avoid; }
.q:last-child { margin-bottom: 0; }
.q .n { font-size: 10pt; font-weight: 700; padding-right: 1.5mm; }
.q .body { font-size: 10pt; font-weight: 500; line-height: 1.4; min-width: 0; overflow-wrap: break-word; }
.q .body p.ln { margin: 0 0 1mm; }
.q .body p.ln:last-child { margin-bottom: 0; }
.opts { margin: 1.5mm 0 0 7mm; display: grid; gap: 1.2mm; }
.opts.two { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 4mm; }
.opt { display: grid; grid-template-columns: 6.5mm minmax(0, 1fr); font-size: 9.5pt; font-weight: 400; line-height: 1.35; }
.opt .ol { font-weight: 500; }
.opt .oc { min-width: 0; overflow-wrap: break-word; }
.opt img { max-width: 100%; height: auto; margin-top: 1mm; }
.muted { color: #777; font-style: italic; }
pre.code { font-family: 'Noto Sans Mono', 'Noto Sans', monospace; font-size: 9.5pt; font-weight: 400; background: #F5F5F5; padding: 2mm; margin: 1.5mm 0 0; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; line-height: 1.4; }
.qs.two pre.code { font-size: 8.5pt; }
.tblwrap { margin: 1.5mm 0 0; break-inside: avoid; }
table.tbl { border-collapse: collapse; width: 100%; font-size: 10pt; font-weight: 400; }
.qs.two table.tbl { font-size: 9.5pt; table-layout: fixed; }
table.tbl th, table.tbl td { border: 0.5pt solid #999; padding: 1.2mm 2mm; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
table.tbl th { font-weight: 600; background: #F5F5F5; }
.qimg { text-align: center; margin: 3mm 0 0; break-inside: avoid; }
.qimg img { max-width: 100%; height: auto; }
.qimg .cap { font-size: 9pt; color: #555; margin-top: 1mm; }
.pgbreak { break-before: page; }
.keypage { break-before: page; }
.keytitle { font-size: 15pt; font-weight: 700; text-align: center; margin: 0 0 1.5mm; }
.keymeta { font-size: 10pt; color: #555; text-align: center; margin: 0 0 4mm; }
table.key { border-collapse: collapse; width: 100%; font-size: 10pt; font-weight: 400; }
table.key th, table.key td { border: 0.5pt solid #999; padding: 1.5mm 2.5mm; text-align: left; vertical-align: middle; }
table.key thead th { background: #F5F5F5; font-weight: 600; }
table.key .num { width: 16mm; }
`;

const PREVIEW_CSS = `
body { background: #E6E6E6; padding: 0; }
.paper { background: #fff; width: 210mm; padding: 16mm; margin: 0 auto; min-height: 297mm; box-shadow: 0 2px 18px rgba(0,0,0,0.18); }
.pgbreak, .keypage { break-before: auto; }
.pgbreak { height: 8mm; }
.pgbreak + .paper { border-top: 0.5pt dashed #BBB; padding-top: 12mm; }
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
  const parts = [meta.title?.trim(), meta.subject?.trim()].filter(Boolean);
  return parts.join(" - ");
}

export function formatPaperDate(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
