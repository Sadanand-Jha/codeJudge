import type {
  DocumentBlock,
  DocumentPage,
  DocumentSettings,
  DocumentTotals,
  ExamDocument,
  PageSize,
  TextAlign,
} from "./types";
import { pageDimensions } from "./types";

export const DOCUMENT_STORAGE_KEY = "quizsupport.paper-studio.document.v1";
export const VERSIONS_STORAGE_KEY = "quizsupport.paper-studio.versions.v1";
export const SHARE_STORAGE_KEY = "quizsupport.paper-studio.shares.v1";

export function newId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createBlock(type: DocumentBlock["type"], overrides: Partial<DocumentBlock> = {}): DocumentBlock {
  return {
    id: newId("block"),
    type,
    placement: "flow",
    html: "",
    ...overrides,
  };
}

export function createPage(overrides: Partial<DocumentPage> = {}): DocumentPage {
  return {
    id: newId("page"),
    blocks: [],
    chrome: true,
    kind: "flow",
    drawings: [],
    ...overrides,
  };
}

const text = (html: string, overrides: Partial<DocumentBlock> = {}): DocumentBlock =>
  createBlock("text", { html, ...overrides });

const heading = (html: string, overrides: Partial<DocumentBlock> = {}): DocumentBlock =>
  createBlock("heading", { html, level: 1, ...overrides });

const question = (html: string, marks: number, sectionId: string, overrides: Partial<DocumentBlock> = {}): DocumentBlock =>
  createBlock("question", { html, marks, sectionId, ...overrides });

const section = (id: string, html: string, overrides: Partial<DocumentBlock> = {}): DocumentBlock =>
  createBlock("section", { id, html, ...overrides });

const field = (label: string, value = ""): DocumentBlock =>
  createBlock("field", { fieldLabel: label, fieldValue: value, width: 94, height: 8 });

export const DEFAULT_SETTINGS: DocumentSettings = {
  pageSize: "A4",
  orientation: "portrait",
  margins: { top: 16, right: 17, bottom: 24, left: 17 },
  columns: 1,
  defaultFontFamily: "Times New Roman",
  defaultFontSize: 11,
  lineHeight: 1.45,
  paragraphSpacing: 6,
  showMarginGuides: false,
};

export function createSeedDocument(): ExamDocument {
  const now = new Date().toISOString();
  const sectionA = "sec_a";
  const sectionB = "sec_b";

  const pageOne = createPage({
    blocks: [
      text(
        `<p style="text-align:center;font-size:10pt;letter-spacing:.14em;text-transform:uppercase;color:#5c5679;margin:0 0 4pt">Department of Computer Science &amp; Engineering</p>`,
        { fontSize: 10 }
      ),
      heading(`<h1 style="text-align:center;font-size:24pt;line-height:1.05;margin:0">ADA Assignment Testing</h1>`, {
        level: 1,
        fontSize: 24,
        align: "center",
      }),
      text(
        `<p style="text-align:center;margin:4pt 0 0;font-size:11.5pt"><strong>Analysis and Design of Algorithms</strong> · B.Tech CSE · Semester V</p>`,
        { align: "center" }
      ),
      text(
        `<p style="text-align:center;margin:2pt 0 0;font-size:9.5pt;color:#5c5679">Assignment 02 · Set A · Maximum Marks: 50 · Time Allowed: 2 hours</p>`,
        { align: "center", fontSize: 9.5 }
      ),
      createBlock("instructions", {
        html: `<p style="margin:0 0 4pt;font-weight:700;font-size:10.5pt;letter-spacing:.08em;text-transform:uppercase">General Instructions</p>
          <ol style="margin:0;padding-left:18pt;font-size:9.6pt;line-height:1.45">
            <li>Attempt all questions. Marks for each question are indicated on the right.</li>
            <li>Write answers in the space provided. Use blue or black ink only.</li>
            <li>Draw neat diagrams wherever necessary and label them clearly.</li>
            <li>Calculators and programmable devices are not permitted.</li>
          </ol>`,
      }),
      field("Name", ""),
      field("Roll No.", ""),
      section(sectionA, `<p style="margin:0;font-size:12pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Section A</p><p style="margin:2pt 0 0;font-size:9pt;color:#5c5679">Short answer questions · 20 marks</p>`, {
        marks: 20,
      }),
      question(
        `<p style="margin:0">Define asymptotic notation. Explain Big-O, Big-Omega and Big-Theta with one example each.</p>`,
        4,
        sectionA
      ),
      question(
        `<p style="margin:0">Solve the recurrence <em>T(n) = 2T(n/2) + n</em> using the master theorem. State the case you applied.</p>`,
        4,
        sectionA
      ),
      question(
        `<p style="margin:0">Trace Dijkstra's algorithm on the weighted graph below. Show the distance table after every iteration.</p>
          <div style="margin-top:5pt;border:1.5pt solid #1a1240;border-radius:3pt;padding:8pt;text-align:center;font-family:'Courier New',monospace;font-size:9pt">A —4— B —1— C<br/>|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br/>2&nbsp;&nbsp;&nbsp;8&nbsp;&nbsp;&nbsp;3<br/>|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br/>D —2— E —5— F</div>`,
        6,
        sectionA
      ),
      question(
        `<p style="margin:0">Compare merge sort and quick sort on time complexity, space complexity, stability and behaviour on nearly sorted input.</p>`,
        6,
        sectionA
      ),
    ],
  });

  const pageTwo = createPage({
    blocks: [
      text(
        `<p style="margin:0;font-size:9pt;color:#5c5679">ADA Assignment Testing · Set A</p>`,
        { fontSize: 9 }
      ),
      section(sectionB, `<p style="margin:0;font-size:12pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Section B</p><p style="margin:2pt 0 0;font-size:9pt;color:#5c5679">Long answer questions · 30 marks</p>`, {
        marks: 30,
      }),
      question(
        `<p style="margin:0">A knapsack can carry at most 15 kg. The available items have weights <em>(2, 3, 5, 7, 8)</em> and profits <em>(10, 15, 22, 30, 34)</em>. Apply the 0/1 knapsack dynamic-programming algorithm and show the complete DP table.</p>`,
        7,
        sectionB
      ),
      question(
        `<p style="margin:0">Find the longest common subsequence of <code>ALGORITHM</code> and <code>LOGARITHM</code> using dynamic programming. Reconstruct the subsequence.</p>`,
        7,
        sectionB
      ),
      question(
        `<p style="margin:0">Build a Huffman tree for the characters and frequencies <em>A: 45, B: 13, C: 12, D: 16, E: 9, F: 5</em>. Encode the word <code>DECAF</code> and calculate the weighted path length.</p>
          <p style="margin:4pt 0 0;color:#5c5679;font-size:9pt">Show all intermediate merges.</p>`,
        8,
        sectionB
      ),
      question(
        `<p style="margin:0">Explain the branch-and-bound strategy for the travelling salesman problem. Draw the state-space tree for five cities and describe how pruning reduces the search.</p>`,
        8,
        sectionB
      ),
      text(
        `<p style="margin:18pt 0 0;font-size:9pt;color:#5c5679"><strong>End of paper.</strong> Re-check your answers before submitting.</p>`,
        { fontSize: 9 }
      ),
    ],
  });

  return {
    id: newId("doc"),
    title: "ADA Assignment Testing",
    meta: {
      title: "ADA Assignment Testing",
      institution: "Department of Computer Science & Engineering",
      subject: "Analysis and Design of Algorithms",
      course: "B.Tech CSE · Semester V",
      date: "21 October 2026",
      timeAllowed: "2 hours",
      maxMarks: 50,
      setLabel: "A",
    },
    settings: { ...DEFAULT_SETTINGS },
    chrome: {
      headerHtml: `<p style="margin:0;font-size:8.5pt;letter-spacing:.12em;text-transform:uppercase;color:#5c5679">Department of Computer Science &amp; Engineering</p>`,
      footerLeftHtml: `<span style="font-size:8.5pt;color:#5c5679">ADA Assignment Testing</span>`,
      showHeader: false,
      showFooter: true,
      showPageNumbers: true,
      showOnFirstPage: false,
    },
    pages: [pageOne, pageTwo],
    comments: [],
    changes: [],
    share: {
      role: "owner",
      linkRole: "viewer",
      allowComments: true,
      allowDownload: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function questionBlocks(document: ExamDocument): Array<{ pageId: string; block: DocumentBlock }> {
  const result: Array<{ pageId: string; block: DocumentBlock }> = [];
  for (const page of document.pages) {
    for (const block of page.blocks) {
      if (block.type === "question") result.push({ pageId: page.id, block });
    }
  }
  return result;
}

export function computeTotals(document: ExamDocument): DocumentTotals {
  const bySection: Record<string, number> = {};
  let total = 0;
  let questionCount = 0;
  let activeSection = "";
  for (const page of document.pages) {
    for (const block of page.blocks) {
      if (block.type === "section") activeSection = block.id;
      if (block.type !== "question") continue;
      questionCount += 1;
      const marks = Number.isFinite(block.marks) ? Number(block.marks) : 0;
      const sectionId = block.sectionId || activeSection || "unassigned";
      bySection[sectionId] = (bySection[sectionId] ?? 0) + marks;
      total += marks;
    }
  }
  return { total, bySection, questionCount };
}

export function sectionMarks(document: ExamDocument, sectionId: string): number {
  return computeTotals(document).bySection[sectionId] ?? 0;
}

/** Renumbers every question in document order and returns a new document. */
export function renumberQuestions(document: ExamDocument): ExamDocument {
  let number = 0;
  const pages = document.pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type !== "question") return block;
      number += 1;
      return { ...block, questionNumber: number };
    }),
  }));
  return touch({ ...document, pages });
}

export function sectionSubtotal(document: ExamDocument, sectionId: string): number {
  let sum = 0;
  for (const page of document.pages) {
    for (const block of page.blocks) {
      if (block.type === "question" && block.sectionId === sectionId) {
        sum += Number.isFinite(block.marks) ? Number(block.marks) : 0;
      }
    }
  }
  return sum;
}

export function questionLabel(block: DocumentBlock, fallbackIndex: number): string {
  const number = block.questionNumber ?? fallbackIndex + 1;
  const hasManualLabel = /^(Q\s*)?\d+[.)]?\s*/i.test(plainTextFromHtml(block.html));
  return hasManualLabel ? "" : `Q${number}.`;
}

export function touch(document: ExamDocument): ExamDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

export function cloneDocument(document: ExamDocument): ExamDocument {
  return JSON.parse(JSON.stringify(document)) as ExamDocument;
}

export function withPageSize(document: ExamDocument, pageSize: PageSize): ExamDocument {
  return touch({ ...document, settings: { ...document.settings, pageSize } });
}

export function reorderPages(document: ExamDocument, from: number, to: number): ExamDocument {
  if (from === to || from < 0 || to < 0 || from >= document.pages.length || to >= document.pages.length) return document;
  const pages = [...document.pages];
  const [moving] = pages.splice(from, 1);
  pages.splice(to, 0, moving);
  return touch({ ...document, pages });
}

export function duplicatePage(document: ExamDocument, pageId: string): ExamDocument {
  const index = document.pages.findIndex((page) => page.id === pageId);
  if (index === -1) return document;
  const source = document.pages[index];
  const copy: DocumentPage = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId("page"),
  };
  copy.blocks = copy.blocks.map((block) => ({ ...block, id: newId("block") }));
  copy.drawings = copy.drawings.map((stroke) => ({ ...stroke, id: newId("stroke"), pageId: copy.id }));
  const pages = [...document.pages];
  pages.splice(index + 1, 0, copy);
  return touch({ ...document, pages });
}

export function deletePage(document: ExamDocument, pageId: string): ExamDocument {
  if (document.pages.length <= 1) return document;
  return touch({ ...document, pages: document.pages.filter((page) => page.id !== pageId) });
}

export function addPage(document: ExamDocument, afterPageId?: string): { document: ExamDocument; pageId: string } {
  const page = createPage();
  const index = afterPageId ? document.pages.findIndex((item) => item.id === afterPageId) : document.pages.length - 1;
  const pages = [...document.pages];
  pages.splice(index + 1, 0, page);
  return { document: touch({ ...document, pages }), pageId: page.id };
}

export function shuffle<T>(items: T[], seed = Date.now()): T[] {
  const result = [...items];
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 16807) % 2147483647;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/**
 * Creates a same-layout set variant: question content and marks are shuffled
 * within each section, then every question is renumbered.
 */
export function createSetVariant(document: ExamDocument, label: string, seed = Date.now()): ExamDocument {
  const copy = cloneDocument(document);
  const orderBySection = new Map<string, number[]>();
  const questions = questionBlocks(copy);
  questions.forEach(({ block }, index) => {
    const key = block.sectionId ?? "unassigned";
    const bucket = orderBySection.get(key) ?? [];
    bucket.push(index);
    orderBySection.set(key, bucket);
  });

  const sourceQuestions = questions.map(({ block }) => ({
    html: block.html,
    marks: block.marks,
    fieldLabel: block.fieldLabel,
    width: block.width,
    height: block.height,
  }));

  orderBySection.forEach((positions) => {
    if (positions.length < 2) return;
    const shuffled = shuffle(positions, seed + positions.length * 17);
    const payload = positions.map((position) => sourceQuestions[position]);
    shuffled.forEach((target, index) => {
      const targetRef = questions[target];
      const content = payload[index];
      targetRef.block.html = content.html;
      targetRef.block.marks = content.marks;
    });
  });

  copy.meta = { ...copy.meta, setLabel: label };
  copy.title = `${document.title.replace(/\s*·\s*Set\s*[A-Z]\s*$/i, "")} · Set ${label}`;
  const renumbered = renumberQuestions(copy);
  return touch(renumbered);
}

export function selectAllEditableText(page: DocumentPage): string {
  return page.blocks.map((block) => plainTextFromHtml(block.html)).join("\n");
}

export function textAlignClass(align: TextAlign | undefined): string {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    case "justify":
      return "text-justify";
    default:
      return "text-left";
  }
}

export function replaceTextInHtml(
  html: string,
  find: string,
  replacement: string,
  options: { regex?: boolean; caseSensitive?: boolean; wholeWord?: boolean }
): { html: string; count: number } {
  if (!find) return { html, count: 0 };
  const flags = options.caseSensitive ? "g" : "gi";
  let pattern = options.regex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (options.wholeWord) pattern = `\\b(?:${pattern})\\b`;
  let count = 0;
  try {
    const regex = new RegExp(pattern, flags);
    const next = html.replace(regex, () => {
      count += 1;
      return replacement;
    });
    return { html: next, count };
  } catch {
    return { html, count: 0 };
  }
}

export function pageStats(page: DocumentPage): { blocks: number; questions: number } {
  return {
    blocks: page.blocks.length,
    questions: page.blocks.filter((block) => block.type === "question").length,
  };
}

export function pageDimensionsLabel(settings: DocumentSettings): string {
  const dims = pageDimensions(settings);
  return `${Math.round(dims.width)} × ${Math.round(dims.height)} mm`;
}
