// Trusted exporter for the Creator Studio document editor.
//
// The browser never supplies the protected footer branding. This service
// rebuilds it from the frozen BRANDING definition, renders the document in
// Chromium, proves that the layer is visible/top-most/uncovered, and only then
// returns PDF/PNG/HTML bytes. DOCX gets the same branding in its page footer.
import sanitizeHtml from "sanitize-html";
import * as cheerio from "cheerio";
import katex from "katex";
import sharp from "sharp";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { getPaperPdfBrowser } from "./paperPdf.service.js";

export type DocumentExportFormat = "pdf" | "docx" | "html" | "png";
export type PageSize = "A4" | "Letter" | "Legal";

export interface ExportBlock {
  id?: string;
  type?: string;
  placement?: "flow" | "free";
  html?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  marks?: number;
  sectionId?: string;
  questionNumber?: number;
  level?: 1 | 2 | 3;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  alt?: string;
  src?: string;
  shape?: "rectangle" | "ellipse" | "line";
  latex?: string;
  fieldLabel?: string;
  fieldValue?: string;
  whiteBackground?: boolean;
  imported?: boolean;
}

export interface ExportPage {
  id?: string;
  blocks?: ExportBlock[];
  background?: string;
  chrome?: boolean;
  kind?: "flow" | "imported";
  drawings?: Array<{
    tool?: string;
    color?: string;
    width?: number;
    opacity?: number;
    points?: Array<{ x?: number; y?: number }>;
  }>;
}

export interface ExportDocument {
  title?: string;
  meta?: {
    title?: string;
    institution?: string;
    subject?: string;
    course?: string;
    date?: string;
    timeAllowed?: string;
    maxMarks?: number;
    setLabel?: string;
  };
  settings?: {
    pageSize?: PageSize;
    orientation?: "portrait" | "landscape";
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    columns?: number;
    defaultFontFamily?: string;
    defaultFontSize?: number;
    lineHeight?: number;
    paragraphSpacing?: number;
  };
  chrome?: {
    headerHtml?: string;
    footerLeftHtml?: string;
    showHeader?: boolean;
    showFooter?: boolean;
    showPageNumbers?: boolean;
    showOnFirstPage?: boolean;
  };
  pages?: ExportPage[];
}

export class DocumentExportError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DocumentExportError";
    this.status = status;
  }
}

const MM_TO_PX = 3.7795275591;
const PAGE_MM: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};
const BRAND = {
  name: "QuizSupport",
  tagline: "Practice. Compete. Excel.",
  widthMm: 46,
  heightMm: 13,
  rightMm: 8,
  bottomMm: 6,
  zIndex: 2_147_483_647,
} as const;
const MAX_PAGES = 120;
const MAX_BLOCKS = 4_000;
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\)|transparent)$/i;
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const safeColor = (value: unknown, fallback: string): string => {
  const color = typeof value === "string" ? value.trim() : "";
  return SAFE_COLOR.test(color) ? color : fallback;
};

const safeFont = (value: unknown, fallback: string): string => {
  const font = typeof value === "string" ? value.trim() : "";
  return /^[a-z0-9\s,'"-]{1,80}$/i.test(font) ? font : fallback;
};

const safeImage = (value: unknown): string => {
  const src = typeof value === "string" ? value.trim() : "";
  return DATA_IMAGE.test(src) ? src : "";
};

function pageDimensions(doc: ExportDocument): { width: number; height: number; size: PageSize; landscape: boolean } {
  const size = doc.settings?.pageSize === "Letter" || doc.settings?.pageSize === "Legal" ? doc.settings.pageSize : "A4";
  const base = PAGE_MM[size];
  const landscape = doc.settings?.orientation === "landscape";
  return landscape
    ? { width: base.height, height: base.width, size, landscape }
    : { width: base.width, height: base.height, size, landscape };
}

function margins(doc: ExportDocument): { top: number; right: number; bottom: number; left: number } {
  return {
    top: clamp(doc.settings?.margins?.top, 4, 70, 18),
    right: clamp(doc.settings?.margins?.right, 4, 70, 16),
    bottom: clamp(doc.settings?.margins?.bottom, 4, 70, 16),
    left: clamp(doc.settings?.margins?.left, 4, 70, 16),
  };
}

function validateDocument(input: unknown): ExportDocument {
  if (!input || typeof input !== "object") throw new DocumentExportError("A document is required.");
  const doc = input as ExportDocument;
  if (!Array.isArray(doc.pages) || doc.pages.length === 0) {
    throw new DocumentExportError("The document has no pages.");
  }
  if (doc.pages.length > MAX_PAGES) {
    throw new DocumentExportError(`Documents are limited to ${MAX_PAGES} pages.`);
  }
  const blockCount = doc.pages.reduce((total, page) => total + (Array.isArray(page.blocks) ? page.blocks.length : 0), 0);
  if (blockCount > MAX_BLOCKS) throw new DocumentExportError("This document has too many blocks to export.");
  return doc;
}

function stripBrandTextFromHtml($: cheerio.CheerioAPI): void {
  $("#qs-export-root").find("*").addBack().contents().each((_, node) => {
    if (node.type === "text") {
      node.data = String(node.data ?? "").replace(/quiz\s*support/gi, "").replace(/\s{2,}/g, " ");
    }
  });
}

export function sanitizeRichHtml(value: unknown): string {
  const input = typeof value === "string" ? value : "";
  if (!input.trim()) return "";
  const clean = sanitizeHtml(input, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup", "mark",
      "ul", "ol", "li", "blockquote", "span", "div", "code", "pre", "a",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "hr",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      p: ["style"],
      span: ["style"],
      div: ["style"],
      table: ["style", "border"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        "text-decoration": [/^(none|underline|line-through)$/],
        color: [SAFE_COLOR],
        "background-color": [SAFE_COLOR],
        border: [/^[0-9.]+(px|pt) (solid|dashed|dotted) #[0-9a-f]{3,8}$/i],
        "border-color": [SAFE_COLOR],
        "border-width": [/^[0-9.]+(px|pt)$/],
        "border-style": [/^(none|solid|dashed|dotted)$/],
        "vertical-align": [/^(top|middle|bottom|baseline)$/],
        "white-space": [/^(normal|pre-wrap)$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
  const $ = cheerio.load(`<div id="qs-export-root">${clean}</div>`, null, false);
  stripBrandTextFromHtml($);
  return $("#qs-export-root").html() ?? "";
}

interface BrandProof {
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

function brandMarkup(): string {
  return `<div class="qs-brand" data-qs-protected-branding="true" data-qs-locked="true" data-qs-system="true" aria-label="${BRAND.name}">
  <span class="qs-brand-mark" aria-hidden="true">Q</span>
  <span class="qs-brand-copy"><strong data-qs-brand-name>${BRAND.name}</strong><small>${BRAND.tagline}</small></span>
</div>`;
}

function safeSvgStrokeWidth(value: unknown): number {
  return clamp(value, 0.1, 12, 0.45);
}

function renderBlock(block: ExportBlock, questionNumber: number): string {
  const html = sanitizeRichHtml(block.html);
  const type = typeof block.type === "string" ? block.type : "text";
  const align = block.fontFamily ? "" : "";
  const style = [
    block.color ? `color:${safeColor(block.color, "#111111")}` : "",
    block.background ? `background:${safeColor(block.background, "transparent")}` : "",
    block.whiteBackground ? "background:#ffffff" : "",
    block.fontSize ? `font-size:${clamp(block.fontSize, 6, 72, 11)}pt` : "",
    block.lineHeight ? `line-height:${clamp(block.lineHeight, 1, 2.6, 1.4)}` : "",
    block.fontFamily ? `font-family:'${safeFont(block.fontFamily, "Times New Roman")}',serif` : "",
    align,
  ].filter(Boolean).join(";");

  if (type === "section") {
    return `<div class="qs-block qs-section" style="${style}"><div class="qs-section-html">${html}</div></div>`;
  }
  if (type === "question") {
    return `<div class="qs-block qs-question" style="${style}">
      <span class="qs-question-number">Q${escapeHtml(questionNumber)}.</span>
      <div class="qs-question-body">${html}</div>
      <span class="qs-question-marks">${escapeHtml(block.marks ?? 0)} marks</span>
    </div>`;
  }
  if (type === "instructions") {
    return `<div class="qs-block qs-instructions" style="${style}">${html}</div>`;
  }
  if (type === "table") {
    return `<div class="qs-block qs-table" style="${style}">${html}</div>`;
  }
  if (type === "divider") {
    return `<div class="qs-block qs-divider"><hr /></div>`;
  }
  if (type === "image" || type === "signature") {
    const src = safeImage(block.src);
    if (!src) return `<div class="qs-block qs-image-placeholder">${type === "signature" ? "Signature" : "Image"}</div>`;
    return `<div class="qs-block qs-image"><img src="${src}" alt="${escapeHtml(block.alt ?? (type === "signature" ? "Signature" : "Image"))}" /></div>`;
  }
  if (type === "shape") {
    const border = `${clamp(block.borderWidth, 0.2, 12, 1.3)}pt solid ${safeColor(block.borderColor, "#1a1240")}`;
    if (block.shape === "line") {
      return `<div class="qs-block qs-shape" style="height:100%;border-top:${border};background:transparent;"></div>`;
    }
    return `<div class="qs-block qs-shape" style="height:100%;border:${border};border-radius:${block.shape === "ellipse" ? "999px" : "1.5mm"};background:${safeColor(block.background, "transparent")};"></div>`;
  }
  if (type === "field") {
    return `<div class="qs-block qs-field"><strong>${escapeHtml(block.fieldLabel || "Field")}:</strong><span>${escapeHtml(block.fieldValue ?? "____________________________")}</span></div>`;
  }
  if (type === "equation") {
    let equation = "";
    try {
      equation = katex.renderToString(String(block.latex ?? ""), {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
        output: "mathml",
      });
    } catch {
      equation = `<span>${escapeHtml(block.latex ?? "")}</span>`;
    }
    return `<div class="qs-block qs-equation">${equation}</div>`;
  }
  if (type === "note") {
    return `<div class="qs-block qs-note">${html}</div>`;
  }
  if (type === "heading") {
    const level = block.level === 1 || block.level === 2 || block.level === 3 ? block.level : 2;
    return `<div class="qs-block qs-heading qs-heading-${level}" style="${style}">${html}</div>`;
  }
  return `<div class="qs-block qs-text" style="${style}">${html || "&nbsp;"}</div>`;
}

function renderDrawings(page: ExportPage, width: number, height: number): string {
  const strokes = Array.isArray(page.drawings) ? page.drawings : [];
  if (!strokes.length) return "";
  const lines = strokes
    .map((stroke) => {
      const points = (Array.isArray(stroke.points) ? stroke.points : [])
        .map((point) => `${clamp(point.x, -1000, 1000, 0)},${clamp(point.y, -1000, 1000, 0)}`)
        .join(" ");
      if (!points) return "";
      return `<polyline points="${points}" fill="none" stroke="${safeColor(stroke.color, "#1a1240")}" stroke-width="${safeSvgStrokeWidth(stroke.width)}" stroke-opacity="${clamp(stroke.opacity, 0, 1, 1)}" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join("");
  return `<svg class="qs-drawings" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>`;
}

function renderPage(doc: ExportDocument, page: ExportPage, pageIndex: number, pageCount: number): string {
  const dims = pageDimensions(doc);
  const m = margins(doc);
  const chrome = page.chrome !== false && (page.kind ?? "flow") === "flow";
  const zoneLeft = dims.width - BRAND.rightMm - BRAND.widthMm;
  const contentBottom = chrome ? Math.max(m.bottom, 24) : 0;
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  let questionNumber = 0;
  const flowBlocks = blocks.filter((block) => block.placement !== "free");
  const freeBlocks = blocks
    .filter((block) => block.placement === "free")
    .sort((a, b) => clamp(a.zIndex, 0, 900, 10) - clamp(b.zIndex, 0, 900, 10));
  const flowHtml = flowBlocks
    .map((block) => {
      if (block.type === "question") questionNumber += 1;
      return renderBlock(block, block.questionNumber ?? questionNumber);
    })
    .join("");
  const freeHtml = freeBlocks
    .map((block) => {
      if (block.type === "question") questionNumber += 1;
      const width = clamp(block.width, 8, dims.width, 60);
      const height = clamp(block.height, 4, dims.height, 20);
      const left = clamp(block.x, 0, dims.width - width, 10);
      const top = clamp(block.y, 0, dims.height - height, 10);
      const rotation = clamp(block.rotation, -360, 360, 0);
      const zIndex = clamp(block.zIndex, 0, 900, 20);
      const overlapsBrand =
        left < dims.width - BRAND.rightMm &&
        left + width > dims.width - BRAND.rightMm - BRAND.widthMm &&
        top < dims.height - BRAND.bottomMm &&
        top + height > dims.height - BRAND.bottomMm - BRAND.heightMm;
      if (overlapsBrand) {
        throw new DocumentExportError("Move floating content out of the protected QuizSupport branding area before exporting.", 422);
      }
      return `<div class="qs-free-block" style="left:${left}mm;top:${top}mm;width:${width}mm;height:${height}mm;transform:rotate(${rotation}deg);z-index:${zIndex}">${renderBlock(block, block.questionNumber ?? questionNumber)}</div>`;
    })
    .join("");
  const header = chrome && doc.chrome?.showHeader && (pageIndex > 0 || doc.chrome?.showOnFirstPage)
    ? `<div class="qs-header" style="left:${m.left}mm;right:${m.right}mm;top:${Math.max(5, m.top - 7)}mm">${sanitizeRichHtml(doc.chrome?.headerHtml)}</div>`
    : "";
  const footer = chrome && doc.chrome?.showFooter
    ? `<div class="qs-footer" style="left:${m.left}mm;right:${dims.width - zoneLeft + 4}mm;bottom:5.5mm">
        <div class="qs-footer-left">${sanitizeRichHtml(doc.chrome?.footerLeftHtml) || escapeHtml(doc.title ?? doc.meta?.title ?? "")}</div>
        ${doc.chrome?.showPageNumbers ? `<span class="qs-page-count">Page ${pageIndex + 1} of ${pageCount}</span>` : ""}
      </div>`
    : "";
  const background = safeImage(page.background)
    ? `<img class="qs-background" src="${safeImage(page.background)}" alt="" aria-hidden="true" />`
    : "";

  return `<section class="qs-page" data-page-index="${pageIndex}" style="width:${dims.width}mm;height:${dims.height}mm">
    ${background}
    ${header}
    <div class="qs-content" style="top:${chrome ? m.top : 0}mm;left:${m.left}mm;right:${m.right}mm;bottom:${contentBottom}mm;column-count:${clamp(doc.settings?.columns, 1, 2, 1)};font-family:'${safeFont(doc.settings?.defaultFontFamily, "Times New Roman")}',serif;font-size:${clamp(doc.settings?.defaultFontSize, 6, 30, 11)}pt;line-height:${clamp(doc.settings?.lineHeight, 1, 2.6, 1.45)}">
      <div class="qs-flow">${flowHtml}</div>
    </div>
    ${freeHtml}
    ${renderDrawings(page, dims.width, dims.height)}
    ${footer}
    ${brandMarkup()}
  </section>`;
}

export function buildDocumentHtml(input: unknown): string {
  const doc = validateDocument(input);
  const dims = pageDimensions(doc);
  const pages = (doc.pages ?? []).map((page, index) => renderPage(doc, page, index, doc.pages?.length ?? 0));
  const title = escapeHtml(doc.title ?? doc.meta?.title ?? "Question paper");
  const pageCss = `@page { size: ${dims.width}mm ${dims.height}mm; margin: 0; }`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #e9e8ee; color: #111; }
  body { font-family: 'Times New Roman', 'Liberation Serif', serif; }
  .qs-page { position: relative; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
  .qs-page:last-child { page-break-after: auto; break-after: auto; }
  .qs-page + .qs-page { margin-top: 8mm; }
  .qs-background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }
  .qs-header { position: absolute; border-bottom: 0.5pt solid #d8d2ef; padding-bottom: 1.5mm; font-size: 9pt; color: #4b465f; }
  .qs-content { position: absolute; overflow: hidden; }
  .qs-flow { display: flex; flex-direction: column; gap: 3.2mm; }
  .qs-block { position: relative; min-width: 0; }
  .qs-heading { font-weight: 700; }
  .qs-heading-1 { font-size: 20pt; }
  .qs-heading-2 { font-size: 15pt; }
  .qs-heading-3 { font-size: 12pt; }
  .qs-section { display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; border-bottom: 1.5px solid #1a1240; padding-bottom: 2mm; font-weight: 700; }
  .qs-question { display: flex; align-items: flex-start; gap: 3mm; }
  .qs-question-number { flex: 0 0 auto; margin-top: 0.3em; font-size: 10.5pt; font-weight: 700; color: #1a1240; }
  .qs-question-body { flex: 1 1 auto; min-width: 0; }
  .qs-question-marks { flex: 0 0 auto; margin-top: 0.2em; font-size: 9pt; font-weight: 700; color: #1a1240; }
  .qs-instructions { border: 1.3pt solid #1a1240; background: #fbfaff; padding: 3.4mm 5mm; box-shadow: 1.5mm 1.5mm 0 rgba(255,210,63,.45); }
  .qs-table table { width: 100%; border-collapse: collapse; }
  .qs-table th, .qs-table td { border: 0.75pt solid #1a1240; padding: 1.6mm 2mm; vertical-align: top; }
  .qs-table th { background: #faf9ff; font-weight: 700; }
  .qs-divider hr { border: 0; border-top: 1.2pt solid #1a1240; margin: 2mm 0; }
  .qs-image, .qs-image-placeholder { width: 100%; min-height: 20mm; }
  .qs-image img { display: block; width: 100%; height: auto; max-height: 110mm; object-fit: contain; }
  .qs-image-placeholder { display: grid; place-items: center; border: 1px dashed #b9b1dc; background: #faf9ff; color: #8b86a3; font-size: 8pt; }
  .qs-field { display: flex; align-items: flex-end; gap: 2mm; }
  .qs-field span { flex: 1 1 auto; border-bottom: 1px solid #1a1240; padding: 0 1mm 0.6mm; }
  .qs-note { border: 1px solid #e7c94a; background: #fff8cc; padding: 2.5mm 3mm; font-size: 9pt; }
  .qs-equation { text-align: center; }
  .qs-equation math { font-size: 1.1em; }
  .qs-free-block { position: absolute; overflow: hidden; }
  .qs-drawings { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 40; }
  .qs-footer { position: absolute; display: flex; align-items: center; gap: 3mm; border-top: 0.5pt solid #d8d2ef; padding-top: 1.8mm; font-size: 8.5pt; color: #5c5679; height: 8mm; }
  .qs-footer-left { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .qs-page-count { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
  .qs-brand { position: absolute; right: ${BRAND.rightMm}mm; bottom: ${BRAND.bottomMm}mm; width: ${BRAND.widthMm}mm; height: ${BRAND.heightMm}mm; display: flex; align-items: center; gap: 2.2mm; padding: 1.6mm 2.2mm; background: #ffffff; border: 1.1pt solid #1a1240; border-radius: 2mm; box-shadow: 1mm 1mm 0 rgba(255,210,63,.55); color: #1a1240; opacity: 1; visibility: visible; z-index: ${BRAND.zIndex}; transform: none; }
  .qs-brand-mark { display: grid; place-items: center; width: 8mm; height: 8mm; flex: 0 0 auto; border: 1.2pt solid #1a1240; border-radius: 1.5mm; background: #ffd23f; font-family: Arial, sans-serif; font-size: 13pt; font-weight: 900; line-height: 1; }
  .qs-brand-copy { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
  .qs-brand-copy strong { font-family: Arial, sans-serif; font-size: 9.5pt; letter-spacing: -.15pt; white-space: nowrap; }
  .qs-brand-copy small { margin-top: .8mm; font-family: Arial, sans-serif; font-size: 5.2pt; font-weight: 700; letter-spacing: .1pt; white-space: nowrap; color: #5c5679; }
  ul, ol { margin: 0.8mm 0; padding-left: 6mm; }
  p { margin: 0 0 1.6mm; }
  p:last-child { margin-bottom: 0; }
  a { color: #1a1240; text-decoration: underline; }
  ${pageCss}
  @media print {
    html, body { background: #fff; }
    .qs-page + .qs-page { margin-top: 0; }
    .qs-page { box-shadow: none; }
  }
</style>
</head>
<body>${pages.join("\n")}</body>
</html>`;
}

async function waitForAssets(page: import("playwright").Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        Array.from(document.images).map((img) =>
          img.complete
            ? null
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      ),
      new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
    ])
  );
}

async function openHtml(page: import("playwright").Page, html: string): Promise<void> {
  await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
  await waitForAssets(page);
}

async function proveBranding(page: import("playwright").Page, pageCount: number): Promise<void> {
  const issues: string[] = [];
  const brands = page.locator('[data-qs-protected-branding="true"]');
  const actual = await brands.count();
  if (actual !== pageCount) {
    throw new DocumentExportError(`Branding layer is missing on ${pageCount - actual} page(s).`, 422);
  }
  for (let index = 0; index < pageCount; index += 1) {
    const brand = brands.nth(index);
    await brand.scrollIntoViewIfNeeded();
    const result = await brand.evaluate((node) => {
      const el = node as HTMLElement;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const page = el.closest(".qs-page") as HTMLElement | null;
      const pageRect = page?.getBoundingClientRect();
      const name = el.querySelector("[data-qs-brand-name]")?.textContent?.trim() ?? "";
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        width: rect.width,
        height: rect.height,
        withinPage: Boolean(
          pageRect &&
            rect.left >= pageRect.left - 1 &&
            rect.top >= pageRect.top - 1 &&
            rect.right <= pageRect.right + 1 &&
            rect.bottom <= pageRect.bottom + 1
        ),
        rightGap: pageRect ? pageRect.right - rect.right : -1,
        bottomGap: pageRect ? pageRect.bottom - rect.bottom : -1,
        topMost: Boolean(hit && (hit === el || el.contains(hit))),
        editable: Boolean(el.closest('[contenteditable="true"]')),
        name,
      };
    });
    const pxPerMm = MM_TO_PX;
    if (result.display === "none") issues.push(`Branding is hidden on page ${index + 1}.`);
    if (result.visibility !== "visible") issues.push(`Branding is not visible on page ${index + 1}.`);
    if (result.opacity !== "1") issues.push(`Branding opacity is not 100% on page ${index + 1}.`);
    if (result.width < BRAND.widthMm * pxPerMm - 2 || result.height < BRAND.heightMm * pxPerMm - 2) {
      issues.push(`Branding is clipped on page ${index + 1}.`);
    }
    if (!result.withinPage) issues.push(`Branding sits outside page ${index + 1}.`);
    if (result.rightGap < BRAND.rightMm * pxPerMm - 2 || result.rightGap > BRAND.rightMm * pxPerMm + 3) {
      issues.push(`Branding is outside the protected right margin on page ${index + 1}.`);
    }
    if (result.bottomGap < BRAND.bottomMm * pxPerMm - 2 || result.bottomGap > BRAND.bottomMm * pxPerMm + 3) {
      issues.push(`Branding is outside the protected bottom margin on page ${index + 1}.`);
    }
    if (!result.topMost) issues.push(`Branding is covered on page ${index + 1}.`);
    if (result.editable) issues.push(`Branding is editable on page ${index + 1}.`);
    if (result.name !== BRAND.name) issues.push(`Branding identity is invalid on page ${index + 1}.`);
  }
  if (issues.length) throw new DocumentExportError(issues[0], 422);
}

function safeBaseName(value: unknown): string {
  const base = String(value ?? "question-paper")
    .replace(/\.[a-z0-9]{1,8}$/i, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base || "question-paper";
}

export interface DocumentExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

function htmlToPlainBlocks(html: string): Array<{ text: string; list: boolean }> {
  const $ = cheerio.load(`<div id="root">${html}</div>`, null, false);
  const root = $("#root");
  const blocks: Array<{ text: string; list: boolean }> = [];
  root.find("p, li, div, blockquote, pre, h1, h2, h3, h4").each((_, element) => {
    if ($(element).parents("li").length && element.tagName !== "li") return;
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (text) blocks.push({ text, list: element.tagName === "li" });
  });
  if (!blocks.length) {
    const text = root.text().replace(/\s+/g, " ").trim();
    if (text) blocks.push({ text, list: false });
  }
  return blocks;
}

function htmlTableToDocx(html: string): Table | null {
  const $ = cheerio.load(`<div id="root">${html}</div>`, null, false);
  const table = $("#root table").first();
  if (!table.length) return null;
  const rows = table.find("tr").toArray().slice(0, 80).map((row) => {
    const cells = $(row).find("th,td").toArray().slice(0, 20).map((cell) => {
      const text = $(cell).text().replace(/\s+/g, " ").trim();
      return new TableCell({
        width: { size: 100 / Math.max(1, $(row).find("th,td").length), type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: text || " ", bold: cell.tagName === "th" })] })],
      });
    });
    return new TableRow({ children: cells.length ? cells : [new TableCell({ children: [new Paragraph(" ")] })] });
  });
  return rows.length ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }) : null;
}

async function docxImageData(src: string): Promise<{ type: "png" | "jpg" | "gif"; data: string | Buffer } | null> {
  const match = /^data:image\/(png|jpe?g|gif|webp);base64,/i.exec(src);
  if (!match) return null;
  if (match[1].toLowerCase() === "webp") {
    const buffer = await sharp(Buffer.from(src.split(",", 2)[1] ?? "", "base64")).png().toBuffer();
    return { type: "png", data: buffer };
  }
  return { type: match[1].toLowerCase().replace("jpeg", "jpg") as "png" | "jpg" | "gif", data: src };
}

async function imageRun(block: ExportBlock): Promise<ImageRun | null> {
  const src = safeImage(block.src);
  if (!src) return null;
  const normalized = await docxImageData(src);
  if (!normalized) return null;
  const width = clamp(block.width, 12, 180, 80);
  return new ImageRun({
    type: normalized.type,
    data: normalized.data,
    transformation: { width: Math.round(width * MM_TO_PX), height: Math.round(width * MM_TO_PX * 0.55) },
    altText: { name: block.alt ?? "Image", description: block.alt ?? "Document image", title: block.alt ?? "Image" },
  });
}

async function buildDocx(input: unknown): Promise<Buffer> {
  const doc = validateDocument(input);
  const page = pageDimensions(doc);
  const m = margins(doc);
  const children: Array<Paragraph | Table> = [];
  let questionNumber = 0;
  for (const [pageIndex, sourcePage] of (doc.pages ?? []).entries()) {
    if (pageIndex > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    const background = safeImage(sourcePage.background);
    if (background) {
      try {
        const normalized = await docxImageData(background);
        if (normalized) {
          children.push(new Paragraph({ children: [new ImageRun({
            type: normalized.type,
            data: normalized.data,
            transformation: { width: Math.round((page.width - m.left - m.right) * MM_TO_PX), height: Math.round((page.height - 30) * MM_TO_PX) },
            altText: { name: "Imported PDF page", description: "Original imported PDF page", title: "Imported PDF page" },
          })] }));
        }
      } catch {
        // Unsupported data URL subtype falls through to the editable text.
      }
    }
    for (const block of sourcePage.blocks ?? []) {
      if (block.type === "question") questionNumber += 1;
      const html = sanitizeRichHtml(block.html);
      const plain = htmlToPlainBlocks(html);
      if (block.type === "divider") {
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "1A1240" } }, children: [] }));
        continue;
      }
      if (block.type === "section") {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "1A1240" } },
          children: [new TextRun({ text: plain.map((part) => part.text).join(" ") || "Section", bold: true })],
        }));
        continue;
      }
      if (block.type === "question") {
        const text = plain.map((part) => `${part.list ? "• " : ""}${part.text}`).join("\n");
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `Q${block.questionNumber ?? questionNumber}. `, bold: true }),
            new TextRun({ text: text || "Question" }),
            new TextRun({ text: `   (${block.marks ?? 0} marks)`, bold: true, color: "5C5679" }),
          ],
        }));
        if (htmlTableToDocx(html)) children.push(htmlTableToDocx(html) as Table);
        continue;
      }
      if (block.type === "table") {
        const table = htmlTableToDocx(html);
        if (table) children.push(table);
        else children.push(new Paragraph({ children: [new TextRun(plain.map((part) => part.text).join(" ") || "Table")] }));
        continue;
      }
      if (block.type === "image" || block.type === "signature") {
        const image = await imageRun(block);
        if (image) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [image] }));
        else children.push(new Paragraph({ children: [new TextRun(block.type === "signature" ? "Signature" : "Image")] }));
        continue;
      }
      if (block.type === "field") {
        children.push(new Paragraph({ children: [
          new TextRun({ text: `${block.fieldLabel || "Field"}: `, bold: true }),
          new TextRun({ text: block.fieldValue || "____________________________" }),
        ] }));
        continue;
      }
      if (block.type === "equation") {
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(block.latex ?? ""), italics: true })] }));
        continue;
      }
      if (block.type === "note") {
        for (const part of plain) children.push(new Paragraph({ shading: { fill: "FFF8CC" }, children: [new TextRun({ text: part.text, italics: true })] }));
        continue;
      }
      if (block.type === "heading") {
        const level = block.level === 1 ? HeadingLevel.HEADING_1 : block.level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2;
        children.push(new Paragraph({ heading: level, children: [new TextRun(plain.map((part) => part.text).join(" ") || "Heading")] }));
        continue;
      }
      if (block.type === "instructions") {
        for (const part of plain) {
          children.push(new Paragraph({
            border: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "B9B1DC" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "B9B1DC" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "B9B1DC" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "B9B1DC" },
            },
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: part.text })],
          }));
        }
        continue;
      }
      if (plain.length === 0) {
        children.push(new Paragraph(" "));
      } else {
        for (const part of plain) {
          children.push(new Paragraph({ children: [new TextRun({ text: `${part.list ? "• " : ""}${part.text}` })] }));
        }
      }
    }
  }
  if (!children.length) children.push(new Paragraph(" "));

  const footerText = doc.chrome?.showFooter && doc.chrome?.footerLeftHtml
    ? htmlToPlainBlocks(sanitizeRichHtml(doc.chrome.footerLeftHtml)).map((part) => part.text).join(" ")
    : "";
  const footer = new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "D8D2EF" } },
        children: [
          new TextRun({ text: `${footerText ? `${footerText}   ·   ` : ""}${BRAND.name} — ${BRAND.tagline}`, size: 16, color: "5C5679", bold: true }),
          ...(doc.chrome?.showPageNumbers
            ? [
                new TextRun({ text: "   ·   Page ", size: 16, color: "5C5679" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "5C5679" }),
                new TextRun({ text: " of ", size: 16, color: "5C5679" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "5C5679" }),
              ]
            : []),
        ],
      }),
    ],
  });
  const header = doc.chrome?.showHeader
    ? new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D8D2EF" } },
          children: [new TextRun({ text: htmlToPlainBlocks(sanitizeRichHtml(doc.chrome.headerHtml)).map((part) => part.text).join(" ") || (doc.title ?? "Question paper"), size: 18, color: "5C5679" })],
        })],
      })
    : undefined;

  const wordDoc = new Document({
    sections: [{
      headers: header ? { default: header } : undefined,
      footers: { default: footer },
      properties: {
        page: {
          size: { width: Math.round(page.width * 56.6929), height: Math.round(page.height * 56.6929), orientation: page.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
          margin: {
            top: Math.round(m.top * 56.6929),
            right: Math.round(m.right * 56.6929),
            bottom: Math.round(m.bottom * 56.6929),
            left: Math.round(m.left * 56.6929),
          },
        },
      },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(wordDoc));
}

export async function exportDocument(input: {
  document: unknown;
  format: DocumentExportFormat;
  pageIndex?: number;
  filename?: string;
}): Promise<DocumentExportResult> {
  const doc = validateDocument(input.document);
  const format = input.format;
  const filename = safeBaseName(input.filename ?? doc.title ?? doc.meta?.title);
  const pageCount = doc.pages?.length ?? 0;

  if (format === "docx") {
    return {
      buffer: await buildDocx(doc),
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: `${filename}.docx`,
    };
  }

  const html = buildDocumentHtml(doc);
  const browser = await getPaperPdfBrowser();
  const context = await browser.newContext({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
  try {
    const browserPage = await context.newPage();
    browserPage.setDefaultTimeout(60_000);
    await openHtml(browserPage, html);
    await proveBranding(browserPage, pageCount);

    if (format === "html") {
      return { buffer: Buffer.from(html, "utf8"), contentType: "text/html; charset=utf-8", filename: `${filename}.html` };
    }

    if (format === "pdf") {
      const pdf = await browserPage.pdf({ printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
      return { buffer: Buffer.from(pdf), contentType: "application/pdf", filename: `${filename}.pdf` };
    }

    const pageIndex = Number(input.pageIndex);
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
      throw new DocumentExportError("Choose a valid page to export as PNG.");
    }
    const target = browserPage.locator(`.qs-page[data-page-index="${pageIndex}"]`).first();
    const png = await target.screenshot({ type: "png", animations: "disabled" });
    return { buffer: Buffer.from(png), contentType: "image/png", filename: `${filename}-page-${pageIndex + 1}.png` };
  } finally {
    await context.close().catch(() => {});
  }
}

/** Static structural self-check used by tests without launching Chromium. */
export function assertBrandingHtmlContract(html: string, expectedPages: number): void {
  const count = (html.match(/data-qs-protected-branding="true"/g) ?? []).length;
  if (count !== expectedPages) throw new DocumentExportError("Branding layer count does not match the page count.", 422);
  if (!html.includes(BRAND.tagline)) throw new DocumentExportError("Branding tagline is missing.", 422);
}

export { BRAND as DOCUMENT_BRAND };
