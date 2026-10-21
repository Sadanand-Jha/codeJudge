import { jsPDF } from "jspdf";
import { buildPaperNumbering, type QuestionPaper } from "@/components/creator/tests/sections/paperTypes";
import { downloadQuestionPaper } from "@/services/aiGenerate";
import {
  DEFAULT_PAPER_HEADER,
  marksForDifficulty,
  withPaperHeaderDefaults,
  type PaperHeaderMeta,
} from "@/utils/paperHeader";

export interface ExportableQuestion {
  question: string;
  questionHtml?: string | null;
  difficulty: string;
  kind: string;
  marks?: number;
  numberLabel?: string;
  /** Bank row for this question, used when the teacher approves it. */
  bankQuestionId?: number | null;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_HEIGHT - MARGIN - 5;
const FONT = "serif";
const MONO = "mono";
const INK: [number, number, number] = [0, 0, 0];
const MUTED: [number, number, number] = [85, 85, 85];
const SHADE: [number, number, number] = [242, 242, 242];
const CODE_BG: [number, number, number] = [245, 245, 245];
const RULE: [number, number, number] = [0, 0, 0];

type FontStyle = "normal" | "bold" | "italic" | "bolditalic";

interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  mono?: boolean;
}

type Block =
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "table"; rows: string[][]; header: boolean }
  | { kind: "code"; text: string };

interface PdfState {
  doc: jsPDF;
  y: number;
  header: PaperHeaderMeta;
  logo: string | null;
}

interface PdfSectionGroup {
  name?: string;
  heading?: string | null;
  attempt?: string | null;
  questions: ExportableQuestion[];
}

interface PdfSectionInput {
  label: string;
  name: string;
  instruction?: string;
  markTotal: number;
  groups: PdfSectionGroup[];
}

const displayOr = (value: string | undefined, fallback: string) => value?.trim() || fallback;
const resolvedHeading = (header: PaperHeaderMeta) => displayOr(header.heading, "Question Paper");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * The bundled serif font covers arrows, minus signs, dashes and most math
 * symbols. A handful of rarer signs are not in its cmap, so map them to plain
 * readable ASCII instead of letting jsPDF emit a missing-glyph box.
 */
const PDF_GLYPH_REPLACEMENTS: Record<string, string> = {
  "\u2208": " in ",
  "\u2209": " not in ",
  "\u2282": " subset of ",
  "\u2286": " subset of or equal to ",
  "\u222a": " union ",
  "\u2207": " grad ",
  "\u21d2": " => ",
  "\u21d0": " <= ",
};

const pdfSafeText = (value: string): string =>
  value.replace(/[\u2208\u2209\u2282\u2286\u222a\u2207\u21d2\u21d0]/g, (char) => PDF_GLYPH_REPLACEMENTS[char] ?? char);

const styleOf = (run: Run): FontStyle =>
  run.bold && run.italic ? "bolditalic" : run.bold ? "bold" : run.italic ? "italic" : "normal";

interface PdfFontAsset {
  file: string;
  vfs: string;
  family: "PaperSerif" | "PaperMono";
  style: FontStyle;
}

const PDF_FONT_ASSETS: PdfFontAsset[] = [
  { file: "/fonts/LiberationSerif-Regular.ttf", vfs: "LiberationSerif-Regular.ttf", family: "PaperSerif", style: "normal" },
  { file: "/fonts/LiberationSerif-Bold.ttf", vfs: "LiberationSerif-Bold.ttf", family: "PaperSerif", style: "bold" },
  { file: "/fonts/LiberationSerif-Italic.ttf", vfs: "LiberationSerif-Italic.ttf", family: "PaperSerif", style: "italic" },
  { file: "/fonts/LiberationSerif-BoldItalic.ttf", vfs: "LiberationSerif-BoldItalic.ttf", family: "PaperSerif", style: "bolditalic" },
  { file: "/fonts/LiberationMono-Regular.ttf", vfs: "LiberationMono-Regular.ttf", family: "PaperMono", style: "normal" },
];

const registeredFontFamilies = new WeakMap<jsPDF, { serif: string; mono: string }>();
let pdfFontFilesPromise: Promise<Map<string, string> | null> | null = null;

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
};

/** Load the bundled Unicode fonts once; fall back to built-in fonts on failure. */
const loadPdfFontFiles = (): Promise<Map<string, string> | null> => {
  if (!pdfFontFilesPromise) {
    pdfFontFilesPromise = Promise.all(
      [...new Set(PDF_FONT_ASSETS.map((asset) => asset.file))].map(async (file) => {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`Failed to load PDF font: ${file}`);
        return [file, toBase64(await response.arrayBuffer())] as const;
      })
    )
      .then((entries) => new Map(entries))
      .catch(() => null);
  }
  return pdfFontFilesPromise;
};

const registerPdfFonts = (doc: jsPDF, files: Map<string, string>) => {
  for (const asset of PDF_FONT_ASSETS) {
    const data = files.get(asset.file);
    if (!data) continue;
    doc.addFileToVFS(asset.vfs, data);
    doc.addFont(asset.vfs, asset.family, asset.style);
  }
  registeredFontFamilies.set(doc, { serif: "PaperSerif", mono: "PaperMono" });
};

const setFont = (
  doc: jsPDF,
  family: string,
  style: FontStyle,
  size: number,
  color: [number, number, number] = INK
) => {
  const registered = registeredFontFamilies.get(doc);
  let resolvedFamily = family;
  let resolvedStyle = style;
  if (family === FONT) {
    resolvedFamily = registered?.serif ?? "times";
  } else if (family === MONO) {
    resolvedFamily = registered?.mono ?? "courier";
    // Only the regular mono face is bundled; keep code readable if a run is
    // bold/italic instead of rendering with a missing face.
    if (registered?.mono && resolvedStyle !== "normal") resolvedStyle = "normal";
  }
  doc.setFont(resolvedFamily, resolvedStyle);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
};

/**
 * Remove labels the model sometimes leaves inside the question text.
 * Whitespace inside the text is kept intact — ASCII art / preformatted
 * output depends on it.
 */
const cleanQuestionText = (value: string) =>
  value
    .replace(/^\s*(?:Q(?:uestion)?\s*)?\d+\s*[.):-]\s*/i, "")
    .replace(/\?\s*\./g, "?")
    .replace(/([^\s])[ \t]+([,.;:!?])/g, "$1$2")
    .trim();

const stripLeadingLabel = (runs: Run[]) => {
  for (const run of runs) {
    if (!run.text.trim()) continue;
    // Keep a trailing space — the next run may be a separate element
    // (e.g. inline <code>) that needs the joining whitespace.
    const trailing = /\s$/.test(run.text) ? " " : "";
    run.text = cleanQuestionText(run.text) + trailing;
    return;
  }
};

const runsFromNode = (
  node: Node,
  inherited: { bold?: boolean; italic?: boolean; mono?: boolean },
  out: Run[]
) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text) out.push({ text, ...inherited });
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  const tag = node.tagName.toLowerCase();
  if (tag === "script" || tag === "style" || tag === "noscript") return;
  if (tag === "br") {
    out.push({ text: "\n", ...inherited });
    return;
  }
  const next = {
    bold: inherited.bold || tag === "b" || tag === "strong",
    italic: inherited.italic || tag === "i" || tag === "em",
    mono: inherited.mono || tag === "code" || tag === "kbd" || tag === "samp",
  };
  for (const child of Array.from(node.childNodes)) runsFromNode(child, next, out);
};

const tableFromElement = (table: HTMLElement): Block => {
  const rows: string[][] = [];
  let header = false;
  table.querySelectorAll("tr").forEach((tr, index) => {
    const cells = Array.from(tr.querySelectorAll("th,td"));
    if (!cells.length) return;
    if (index === 0 && cells.some((cell) => cell.tagName.toLowerCase() === "th")) header = true;
    rows.push(cells.map((cell) => normalizeWhitespace(cell.textContent ?? "")));
  });
  const columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  rows.forEach((row) => {
    while (row.length < columns) row.push("");
  });
  return { kind: "table", rows, header };
};

const parseHtmlBlocks = (html: string): Block[] => {
  if (typeof DOMParser === "undefined") return [];
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks: Block[] = [];

  const walk = (parent: Node) => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (text.trim()) blocks.push({ kind: "paragraph", runs: [{ text }] });
        continue;
      }
      if (!(child instanceof HTMLElement)) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === "script" || tag === "style" || tag === "noscript") continue;
      if (tag === "table") {
        blocks.push(tableFromElement(child));
        continue;
      }
      if (tag === "pre") {
        blocks.push({ kind: "code", text: child.textContent ?? "" });
        continue;
      }
      if (tag === "ul" || tag === "ol") {
        const items = Array.from(child.children).filter((el) => el.tagName.toLowerCase() === "li");
        items.forEach((item, index) => {
          const runs: Run[] = [{ text: tag === "ol" ? `${index + 1}. ` : "\u2022 " }];
          for (const content of Array.from(item.childNodes)) {
            if (content instanceof HTMLElement && ["ul", "ol"].includes(content.tagName.toLowerCase())) continue;
            runsFromNode(content, {}, runs);
          }
          if (runs.some((run) => run.text.trim())) blocks.push({ kind: "paragraph", runs });
        });
        continue;
      }
      if (["div", "section", "article", "body", "main"].includes(tag)) {
        walk(child);
        continue;
      }
      if (["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "figcaption"].includes(tag)) {
        const runs: Run[] = [];
        runsFromNode(child, {}, runs);
        if (runs.some((run) => run.text.trim())) blocks.push({ kind: "paragraph", runs });
        continue;
      }
      const runs: Run[] = [];
      runsFromNode(child, {}, runs);
      if (runs.some((run) => run.text.trim())) blocks.push({ kind: "paragraph", runs });
    }
  };

  walk(parsed.body);
  return blocks;
};

const plainBlocks = (text: string): Block[] => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const firstIndex = lines.findIndex((line) => line.trim());
  if (firstIndex < 0) return [];
  lines[firstIndex] = cleanQuestionText(lines[firstIndex]);
  const question = lines[firstIndex];
  const rest = lines.slice(firstIndex + 1);
  const preformatted = rest.some((line) => /^\s+\S/.test(line) || /\S {2,}\S/.test(line));
  if (preformatted) {
    const code = rest.join("\n").replace(/^\n+/, "").replace(/\s+$/, "");
    return code
      ? [
          { kind: "paragraph", runs: [{ text: question }] },
          { kind: "code", text: code },
        ]
      : [{ kind: "paragraph", runs: [{ text: question }] }];
  }
  const body = rest.map((line) => line.trim()).filter(Boolean).join(" ");
  return [{ kind: "paragraph", runs: [{ text: body ? `${question} ${body}` : question }] }];
};

const questionBlocks = (question: ExportableQuestion): Block[] => {
  const blocks = question.questionHtml?.trim() ? parseHtmlBlocks(question.questionHtml) : [];
  const result = blocks.length ? blocks : plainBlocks(question.question);
  const firstParagraph = result.find((block) => block.kind === "paragraph");
  if (firstParagraph && firstParagraph.kind === "paragraph") stripLeadingLabel(firstParagraph.runs);
  return result;
};

const wrapRuns = (doc: jsPDF, runs: Run[], maxWidth: number, size: number): Run[][] => {
  const lines: Run[][] = [];
  let line: Run[] = [];
  let width = 0;

  const flush = () => {
    if (!line.length) return;
    while (line.length && !line[line.length - 1].text.trim()) line.pop();
    if (line.length) lines.push(line);
    line = [];
    width = 0;
  };

  for (const run of runs) {
    const segments = pdfSafeText(run.text).split("\n");
    segments.forEach((segment, segmentIndex) => {
      if (segmentIndex > 0) flush();
      // Monospace runs (code / ASCII art) must keep their inner spacing, so
      // they are kept whole instead of being split around whitespace runs.
      const parts = run.mono ? [segment] : segment.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        const isSpace = /^\s+$/.test(part);
        if (isSpace && line.length === 0 && lines.length === 0) continue;
        setFont(doc, run.mono ? MONO : FONT, styleOf(run), size);
        const partWidth = doc.getTextWidth(part);
        if (width + partWidth > maxWidth && line.length > 0) {
          flush();
          if (isSpace) continue;
        }
        if (line.length === 0 && partWidth > maxWidth) {
          let chunk = part;
          while (chunk) {
            let cut = chunk.length;
            while (cut > 1 && doc.getTextWidth(chunk.slice(0, cut)) > maxWidth) cut -= 1;
            line.push({ ...run, text: chunk.slice(0, cut) });
            width = doc.getTextWidth(chunk.slice(0, cut));
            flush();
            chunk = chunk.slice(cut);
          }
          continue;
        }
        line.push({ ...run, text: part });
        width += doc.getTextWidth(part);
      }
    });
  }
  flush();
  return lines;
};

const ensureSpace = (state: PdfState, needed: number) => {
  if (state.y + needed <= CONTENT_BOTTOM) return;
  state.doc.addPage();
  state.y = 24;
  const { doc } = state;
  setFont(doc, FONT, "italic", 8, MUTED);
  const pageTitle = fitText(doc, resolvedHeading(state.header), CONTENT_WIDTH, 8, "italic");
  doc.text(pageTitle, MARGIN, 12);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 15, PAGE_WIDTH - MARGIN, 15);
  setFont(doc, FONT, "normal", 12, INK);
};

const renderRuns = (
  state: PdfState,
  runs: Run[],
  x: number,
  width: number,
  size: number,
  lineHeight: number,
  color: [number, number, number] = INK
) => {
  const { doc } = state;
  const lines = wrapRuns(doc, runs, width, size);
  for (const line of lines) {
    ensureSpace(state, lineHeight);
    let cursor = x;
    for (const piece of line) {
      setFont(doc, piece.mono ? MONO : FONT, styleOf(piece), piece.mono ? 10.5 : size, color);
      doc.text(piece.text, cursor, state.y + size * 0.3528 * 0.82);
      cursor += doc.getTextWidth(piece.text);
    }
    state.y += lineHeight;
  }
  if (!lines.length) state.y += lineHeight;
};

const wrapPlain = (doc: jsPDF, text: string, width: number, size: number, style: FontStyle = "normal") => {
  setFont(doc, FONT, style, size);
  return doc.splitTextToSize(pdfSafeText(text), width) as string[];
};

const columnWidths = (doc: jsPDF, rows: string[][], columns: number, totalWidth: number) => {
  setFont(doc, FONT, "normal", 10);
  const natural = Array.from({ length: columns }, (_, column) => {
    const widest = rows.reduce((max, row) => {
      const value = row[column] ?? "";
      return Math.max(max, doc.getTextWidth(value));
    }, 12);
    return widest + 5;
  });
  const sum = natural.reduce((value, width) => value + width, 0);
  if (sum <= totalWidth) {
    const extra = (totalWidth - sum) / columns;
    return natural.map((width) => width + extra);
  }
  const scaled = natural.map((width) => Math.max(14, (width / sum) * totalWidth));
  const scaledSum = scaled.reduce((value, width) => value + width, 0);
  return scaled.map((width) => (width / scaledSum) * totalWidth);
};

const renderTable = (state: PdfState, block: Extract<Block, { kind: "table" }>, x: number, width: number) => {
  const { doc } = state;
  const columns = block.rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (!columns) return;
  const widths = columnWidths(doc, block.rows, columns, width);
  const padding = 2;
  const fontSize = 10;
  const lineHeight = 4.4;
  const headerRows = block.header ? 1 : 0;
  let index = 0;

  const drawRow = (row: string[], header: boolean) => {
    const cellLines = widths.map((cellWidth, column) =>
      wrapPlain(doc, row[column] ?? "", cellWidth - padding * 2, fontSize, header ? "bold" : "normal")
    );
    const height = Math.max(...cellLines.map((lines) => lines.length)) * lineHeight + padding * 2;
    const previousY = state.y;
    ensureSpace(state, height);
    if (state.y < previousY && headerRows && index > headerRows) {
      drawRow(block.rows[0], true);
    }
    let cellX = x;
    widths.forEach((cellWidth, column) => {
      if (header) {
        doc.setFillColor(...SHADE);
        doc.rect(cellX, state.y, cellWidth, height, "F");
      }
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.2);
      doc.rect(cellX, state.y, cellWidth, height, "S");
      cellLines[column].forEach((line, lineIndex) => {
        setFont(doc, FONT, header ? "bold" : "normal", fontSize, INK);
        doc.text(line, cellX + padding, state.y + padding + 3.2 + lineIndex * lineHeight);
      });
      cellX += cellWidth;
    });
    state.y += height;
  };

  if (headerRows && block.rows.length) {
    while (index < headerRows) {
      drawRow(block.rows[index], true);
      index += 1;
    }
  }
  while (index < block.rows.length) {
    drawRow(block.rows[index], false);
    index += 1;
  }
};

const renderCode = (state: PdfState, text: string, x: number, width: number) => {
  const { doc } = state;
  setFont(doc, MONO, "normal", 10.5);
  const fitWidth = width - 6;
  const lines = pdfSafeText(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .flatMap((line) => {
      if (!line) return [""];
      // Keep short lines (ASCII art etc.) exactly as written — wrap only
      // lines that are wider than the block.
      if (doc.getTextWidth(line) <= fitWidth) return [line];
      return doc.splitTextToSize(line, fitWidth) as string[];
    });
  let index = 0;
  while (index < lines.length) {
    ensureSpace(state, 12);
    const available = Math.max(1, Math.floor((CONTENT_BOTTOM - state.y - 4) / 4.5));
    const chunk = lines.slice(index, index + available);
    const height = chunk.length * 4.5 + 4;
    doc.setFillColor(...CODE_BG);
    doc.setDrawColor(153, 153, 153);
    doc.setLineWidth(0.2);
    doc.rect(x, state.y, width, height, "FD");
    chunk.forEach((line, lineIndex) => {
      setFont(doc, MONO, "normal", 10.5, INK);
      doc.text(line, x + 3, state.y + 4.6 + lineIndex * 4.5);
    });
    state.y += height + 1.5;
    index += chunk.length;
  }
};

const renderBlocks = (state: PdfState, blocks: Block[], x: number, width: number, size = 12) => {
  blocks.forEach((block, index) => {
    if (block.kind === "paragraph") {
      renderRuns(state, block.runs, x, width, size, 5.2);
    } else if (block.kind === "table") {
      renderTable(state, block, x, width);
    } else {
      renderCode(state, block.text, x, width);
    }
    if (index < blocks.length - 1) state.y += 2.2;
  });
};

const fitText = (doc: jsPDF, text: string, maxWidth: number, size: number, style: FontStyle) => {
  setFont(doc, FONT, style, size);
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let value = text;
  while (value.length > 4 && doc.getTextWidth(`${value}\u2026`) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}\u2026`;
};

const drawField = (state: PdfState, label: string, value: string, x: number, width: number) => {
  const { doc } = state;
  setFont(doc, FONT, "bold", 11, INK);
  doc.text(label, x, state.y);
  const labelWidth = doc.getTextWidth(label);
  setFont(doc, FONT, "normal", 11, INK);
  doc.text(fitText(doc, value, width - labelWidth - 2, 11, "normal"), x + labelWidth + 2, state.y);
};

const drawHeader = (state: PdfState, maxMarks: number) => {
  const { doc, header } = state;
  if (header.instituteName.trim()) {
    setFont(doc, FONT, "bold", 16, INK);
    doc.text(header.instituteName.trim().toUpperCase(), PAGE_WIDTH / 2, state.y + 6, { align: "center" });
    state.y += 13.5;
  } else {
    state.y += 2;
  }

  setFont(doc, FONT, "bold", 14, INK);
  const titleLines = doc.splitTextToSize(resolvedHeading(header), CONTENT_WIDTH) as string[];
  titleLines.forEach((line) => {
    doc.text(line, PAGE_WIDTH / 2, state.y + 4.5, { align: "center" });
    state.y += 6.8;
  });
  state.y += 5;

  const left = MARGIN;
  const right = 108;
  const fields: Array<[string, string]> = [];
  if (header.subject.trim()) fields.push(["Subject: ", header.subject.trim()]);
  if (header.date.trim()) fields.push(["Date: ", header.date.trim()]);
  if (header.className.trim()) fields.push(["Class / Semester: ", header.className.trim()]);
  if (header.timeAllowed.trim()) fields.push(["Time allowed: ", header.timeAllowed.trim()]);
  fields.push(["Maximum Marks: ", String(maxMarks)]);
  if (header.setName.trim()) fields.push(["Set: ", header.setName.trim()]);

  for (let i = 0; i < fields.length; i += 2) {
    drawField(state, fields[i][0], fields[i][1], left, 82);
    if (fields[i + 1]) drawField(state, fields[i + 1][0], fields[i + 1][1], right, 78);
    state.y += 6;
  }
  state.y += 2;

  if (header.showStudentBlock) {
    setFont(doc, FONT, "bold", 11, INK);
    doc.text("Name:", left, state.y);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.line(left + 12, state.y + 1, 88, state.y + 1);
    setFont(doc, FONT, "bold", 11, INK);
    doc.text("Roll No.:", 108, state.y);
    doc.line(128, state.y + 1, 190, state.y + 1);
    state.y += 5;
  }

  doc.setLineWidth(0.6);
  doc.line(MARGIN, state.y, PAGE_WIDTH - MARGIN, state.y);
  state.y += 6;
};

const instructionLines = (total: number, attempt: number, hasChoice: boolean) => [
  `Total questions: ${total}. Questions to attempt: ${attempt}.`,
  hasChoice ? "Sections with internal choice are marked in the paper." : "All questions are compulsory.",
  "Figures in square brackets on the right indicate marks.",
  "Write your answers in the answer book.",
];

/** Split the teacher's custom instructions into numbered items. */
const customInstructionItems = (value?: string) =>
  (value ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:\d+\s*[.):-]\s*|[-•*]\s*)/, "").trim())
    .filter(Boolean);

const drawInstructions = (
  state: PdfState,
  total: number,
  attempt: number,
  hasChoice: boolean,
  custom?: string
) => {
  const { doc } = state;
  const customItems = customInstructionItems(custom);
  const items = customItems.length ? customItems : instructionLines(total, attempt, hasChoice);
  const lines: Array<{ text: string; indent: boolean }> = [];
  items.forEach((item, index) => {
    const prefix = `${index + 1}. `;
    const wrapped = wrapPlain(doc, item, CONTENT_WIDTH - 12, 10.5);
    wrapped.forEach((line, lineIndex) => {
      lines.push({ text: lineIndex === 0 ? `${prefix}${line}` : line, indent: lineIndex > 0 });
    });
  });
  const height = lines.length * 4.6 + 13;
  ensureSpace(state, height + 4);
  const top = state.y;
  doc.setFillColor(...SHADE);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.35);
  doc.rect(MARGIN, top, CONTENT_WIDTH, height, "FD");
  setFont(doc, FONT, "bold", 11, INK);
  doc.text("General instructions", MARGIN + 4, top + 5.5);
  lines.forEach((line, index) => {
    setFont(doc, FONT, "normal", 10.5, INK);
    doc.text(line.text, MARGIN + (line.indent ? 11 : 4), top + 11.5 + index * 4.6);
  });
  state.y = top + height + 5;
};

const drawSection = (
  state: PdfState,
  {
    label,
    name,
    markTotal,
    count,
    marksPerQuestion,
    uniformMarks,
    instruction,
  }: {
    label: string;
    name: string;
    markTotal: number;
    count: number;
    marksPerQuestion: number;
    uniformMarks: boolean;
    instruction?: string;
  }
) => {
  const { doc } = state;
  ensureSpace(state, 30);
  const bannerHeight = 8;
  const top = state.y;
  doc.setFillColor(...SHADE);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.35);
  doc.rect(MARGIN, top, CONTENT_WIDTH, bannerHeight, "FD");
  setFont(doc, FONT, "bold", 12, INK);
  const sectionName = displayOr(name, "Questions").toUpperCase();
  doc.text(`SECTION ${label.toUpperCase()} \u2014 ${sectionName}`, MARGIN + 3, top + 5.4);
  const totalLabel = uniformMarks
    ? `${count} \u00d7 ${marksPerQuestion} = ${markTotal} marks`
    : `Total: ${markTotal} marks`;
  doc.text(totalLabel, PAGE_WIDTH - MARGIN - 3, top + 5.4, { align: "right" });
  state.y = top + bannerHeight + 5;
  if (instruction?.trim()) {
    setFont(doc, FONT, "italic", 10.5, MUTED);
    const lines = doc.splitTextToSize(instruction.trim(), CONTENT_WIDTH) as string[];
    lines.forEach((line) => {
      doc.text(line, MARGIN, state.y);
      state.y += 5;
    });
    state.y += 1;
  }
  setFont(doc, FONT, "normal", 12, INK);
};

const drawGroupHeading = (state: PdfState, group: PdfSectionGroup, count: number) => {
  const { doc } = state;
  const heading = group.heading !== undefined ? group.heading : group.name;
  const attempt = group.attempt?.trim() || (count > 0 ? "Answer all questions." : "");
  if (!heading?.trim() && !attempt) return;
  ensureSpace(state, 17);
  if (heading?.trim()) {
    setFont(doc, FONT, "bold", 11, INK);
    doc.text(fitText(doc, heading.trim(), CONTENT_WIDTH, 11, "bold"), MARGIN, state.y + 4);
    state.y += 9;
  }
  if (attempt) {
    setFont(doc, FONT, "italic", 10.5, MUTED);
    doc.text(fitText(doc, attempt, CONTENT_WIDTH, 10.5, "italic"), MARGIN, state.y);
    state.y += 5;
  }
  setFont(doc, FONT, "normal", 12, INK);
};

const drawQuestion = (state: PdfState, question: ExportableQuestion, number: number, marks: number) => {
  const { doc } = state;
  const blocks = questionBlocks(question);
  ensureSpace(state, 18);
  const top = state.y;
  const baseline = top + 3.8;
  const questionLabel = question.numberLabel?.trim() || `Q${number}`;
  const marksLabel = `[${marks}]`;
  setFont(doc, FONT, "bold", 12, INK);
  doc.text(questionLabel, MARGIN, baseline);
  setFont(doc, FONT, "bold", 11, INK);
  const marksWidth = doc.getTextWidth(marksLabel);
  doc.text(marksLabel, PAGE_WIDTH - MARGIN, baseline, { align: "right" });
  state.y = top;
  const contentX = MARGIN + 12;
  const contentWidth = Math.max(
    40,
    PAGE_WIDTH - MARGIN - contentX - marksWidth - 10
  );
  renderBlocks(state, blocks, contentX, contentWidth);
  state.y += 4;
};

const drawEnd = (state: PdfState) => {
  ensureSpace(state, 12);
  const { doc } = state;
  setFont(doc, FONT, "italic", 10.5, MUTED);
  doc.text("End of question paper", PAGE_WIDTH / 2, state.y + 5, { align: "center" });
  state.y += 10;
};

const drawFooters = (state: PdfState) => {
  const { doc } = state;
  const total = doc.getNumberOfPages();
  const footerY = 282.5;
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, 280, PAGE_WIDTH - MARGIN, 280);
    setFont(doc, FONT, "normal", 8.5, MUTED);
    const left = fitText(doc, resolvedHeading(state.header), 72, 8.5, "normal");
    doc.text(left, MARGIN, 286);
    setFont(doc, FONT, "normal", 9, MUTED);
    doc.text(`Page ${page} of ${total}`, PAGE_WIDTH / 2, 286, { align: "center" });
    setFont(doc, FONT, "bold", 9, INK);
    const brand = "QuizSupport";
    const brandWidth = doc.getTextWidth(brand);
    doc.text(brand, PAGE_WIDTH - MARGIN, 286, { align: "right" });
    if (state.logo) {
      const height = 4.6;
      const width = (height * 512) / 468;
      doc.addImage(
        state.logo,
        "PNG",
        PAGE_WIDTH - MARGIN - brandWidth - 2 - width,
        footerY,
        width,
        height,
        "quizsupport-logo",
        "FAST"
      );
    }
  }
};

let cachedLogo: string | null | undefined;

const loadBrandLogo = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const response = await fetch("/logos/mark.png");
    if (!response.ok) throw new Error("Logo unavailable");
    const blob = await response.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "question-paper";

const paperFileName = (header: PaperHeaderMeta) =>
  slugify(`${displayOr(header.subject, "")} ${resolvedHeading(header)}`.trim());

async function renderPaperPdf({
  header,
  sections,
  totalQuestions,
  attemptQuestions,
  hasChoice,
  customInstructions,
}: {
  header: PaperHeaderMeta;
  sections: PdfSectionInput[];
  totalQuestions: number;
  attemptQuestions: number;
  hasChoice: boolean;
  customInstructions?: string;
}): Promise<void> {
  const [logo, fontFiles] = await Promise.all([loadBrandLogo(), loadPdfFontFiles()]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (fontFiles) registerPdfFonts(doc, fontFiles);
  const maxMarks = sections.reduce((total, section) => total + section.markTotal, 0);

  doc.setProperties({
    title: resolvedHeading(header),
    subject: displayOr(header.subject, ""),
    creator: "QuizSupport",
  });

  const state: PdfState = { doc, y: MARGIN, header, logo };

  drawHeader(state, maxMarks);
  drawInstructions(state, totalQuestions, attemptQuestions, hasChoice, customInstructions);

  let questionNumber = 0;
  sections.forEach((section) => {
    const questions = section.groups.flatMap((group) => group.questions);
    const resolvedMarks = questions.map(
      (question) => question.marks ?? marksForDifficulty(header, question.difficulty)
    );
    const uniformMarks = resolvedMarks.every((value) => value === resolvedMarks[0]);
    drawSection(state, {
      label: section.label,
      name: section.name,
      markTotal: section.markTotal,
      count: questions.length,
      marksPerQuestion: resolvedMarks[0] ?? marksForDifficulty(header),
      uniformMarks,
      instruction: section.instruction,
    });
    section.groups.forEach((group) => {
      drawGroupHeading(state, group, group.questions.length);
      group.questions.forEach((question) => {
        questionNumber += 1;
        drawQuestion(
          state,
          question,
          questionNumber,
          question.marks ?? marksForDifficulty(header, question.difficulty)
        );
      });
    });
  });

  drawEnd(state);
  drawFooters(state);
  doc.save(`${paperFileName(header)}.pdf`);
}

export async function downloadQuestionsPdf({
  questions,
  title,
  subject,
  header,
}: {
  questions: ExportableQuestion[];
  title: string;
  subject?: string | null;
  header?: Partial<PaperHeaderMeta>;
}): Promise<void> {
  if (questions.length === 0) return;

  const resolved = withPaperHeaderDefaults({
    ...header,
    heading: header?.heading?.trim() || title || DEFAULT_PAPER_HEADER.heading,
    subject: header?.subject?.trim() || subject || "",
  });
  const marks = questions.map(
    (question) => question.marks ?? marksForDifficulty(resolved, question.difficulty)
  );
  const totalMarks = marks.reduce((total, value) => total + value, 0);

  await renderPaperPdf({
    header: resolved,
    sections: [
      {
        label: "A",
        name: "Subjective Questions",
        instruction: "All questions are compulsory.",
        markTotal: totalMarks,
        groups: [
          {
            questions: questions.map((question, index) => ({ ...question, marks: marks[index] })),
          },
        ],
      },
    ],
    totalQuestions: questions.length,
    attemptQuestions: questions.length,
    hasChoice: false,
    customInstructions: resolved.instructions,
  });
}

export async function downloadPaperPdf({
  paper,
  header,
}: {
  paper: QuestionPaper;
  header?: Partial<PaperHeaderMeta>;
}): Promise<void> {
  if (!paper.sections.length) return;

  const resolved = withPaperHeaderDefaults({
    ...header,
    heading: header?.heading?.trim() || paper.title || DEFAULT_PAPER_HEADER.heading,
    subject: header?.subject?.trim() || "",
  });

  const numbering = buildPaperNumbering(paper.sections);
  const sections: PdfSectionInput[] = paper.sections.map((section, sectionIndex) => {
    const groups: PdfSectionGroup[] = section.questionGroups.map((group, groupIndex) => {
      const attempt =
        group.attemptRule.type === "ANY_N" && group.attemptRule.count
          ? `Attempt any ${group.attemptRule.count} of the following ${group.questions.length} questions.`
          : null;
      const groupNumbering = numbering[sectionIndex]?.[groupIndex];
      return {
        name: group.name,
        heading: groupNumbering?.heading ?? null,
        attempt,
        questions: group.questions.map((question, questionIndex) => ({
          ...question,
          numberLabel: groupNumbering?.labels[questionIndex],
          marks:
            question.marks ??
            (group.marksPerQuestion > 0
              ? group.marksPerQuestion
              : marksForDifficulty(resolved, question.difficulty)),
        })),
      };
    });
    const questions = groups.flatMap((group) => group.questions);
    const marks = questions.reduce((total, question) => total + (question.marks ?? 0), 0);
    const hasChoice = groups.some((group) => Boolean(group.attempt));
    const instruction =
      section.instructions?.trim() ||
      (hasChoice
        ? "Attempt the questions as per the choice given below."
        : "All questions are compulsory.");
    return {
      label: section.label,
      name: section.name,
      instruction,
      markTotal: section.sectionMarks || marks,
      groups,
    };
  });

  const allQuestions = sections.flatMap((section) =>
    section.groups.flatMap((group) => group.questions)
  );
  const attemptQuestions = sections.reduce(
    (total, section) =>
      total +
      section.groups.reduce((groupTotal, group) => {
        const match = group.attempt?.match(/any\s+(\d+)/i);
        return groupTotal + (match ? Math.min(Number(match[1]), group.questions.length) : group.questions.length);
      }, 0),
    0
  );

  await renderPaperPdf({
    header: resolved,
    sections,
    totalQuestions: allQuestions.length,
    attemptQuestions,
    hasChoice: sections.some((section) => section.groups.some((group) => Boolean(group.attempt))),
    customInstructions: resolved.instructions.trim() || paper.instructions,
  });
}

/** Word export uses the backend's DOCX renderer, which understands HTML tables. */
export async function downloadQuestionsDocx({
  questions,
  title,
  subject,
  header,
}: {
  questions: ExportableQuestion[];
  title: string;
  subject?: string | null;
  header?: Partial<PaperHeaderMeta>;
}): Promise<void> {
  if (questions.length === 0) return;

  const resolved = withPaperHeaderDefaults({
    ...header,
    heading: header?.heading?.trim() || title || DEFAULT_PAPER_HEADER.heading,
    subject: header?.subject?.trim() || subject || "",
  });
  const marks = questions.map(
    (question) => question.marks ?? marksForDifficulty(resolved, question.difficulty)
  );
  const totalMarks = marks.reduce((total, value) => total + value, 0);
  const customItems = customInstructionItems(resolved.instructions);

  const paper: QuestionPaper = {
    title: resolved.heading,
    instructions: customItems.length
      ? customItems.join(" ")
      : "All questions are compulsory. Figures in square brackets on the right indicate marks.",
    syllabus: "",
    sections: [
      {
        order: 1,
        label: "A",
        name: resolved.subject || "Questions",
        title: "",
        instructions: "All questions are compulsory.",
        questionGroups: [
          {
            name: "Subjective Questions",
            type: "subjective",
            marksPerQuestion: marks[0] ?? resolved.mediumMarks,
            attemptRule: { type: "ALL", count: null },
            questions: questions.map((question, index) => ({
              num: index + 1,
              question: question.question,
              questionHtml: question.questionHtml ?? null,
              difficulty: question.difficulty,
              kind: question.kind,
              marks: marks[index],
            })),
          },
        ],
        totalQuestions: questions.length,
        totalAvailableMarks: totalMarks,
        sectionMarks: totalMarks,
      },
    ],
    totalQuestions: questions.length,
    totalMarks,
    meta: resolved,
  };

  await downloadQuestionPaper(paper);
}
