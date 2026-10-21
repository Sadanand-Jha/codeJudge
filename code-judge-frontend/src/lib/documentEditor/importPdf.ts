import type { DocumentBlock, DocumentPage, ExamDocument } from "./types";
import { containsBrandingText, stripBrandingText } from "./branding";
import { createSeedDocument, escapeHtml, newId, touch } from "./model";

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
}

interface PdfTextStyle {
  fontFamily?: string;
}

interface PdfTextContent {
  items: Array<PdfTextItem | { type?: string }>;
  styles?: Record<string, PdfTextStyle>;
}

export interface PdfImportProgress {
  page: number;
  total: number;
  phase: "rendering" | "reading" | "finalising";
}

export interface PdfImportResult {
  document: ExamDocument;
  pageCount: number;
  textBlocks: number;
  scannedPages: number;
}

const RENDER_SCALE = 1.65;
const A4 = { width: 210, height: 297 };

function fontFor(item: PdfTextItem, styles: Record<string, PdfTextStyle> | undefined): string {
  const raw = (item.fontName && styles?.[item.fontName]?.fontFamily) || item.fontName || "";
  const lower = raw.toLowerCase();
  if (lower.includes("mono") || lower.includes("courier")) return "'Courier New', monospace";
  if (lower.includes("sans") || lower.includes("arial") || lower.includes("helvetica")) return "Arial, Helvetica, sans-serif";
  if (lower.includes("georgia")) return "Georgia, serif";
  if (lower.includes("calibri")) return "Calibri, sans-serif";
  return "'Times New Roman', 'Liberation Serif', serif";
}

function groupItems(items: PdfTextItem[], pageWidth: number, pageHeight: number): PdfTextItem[][] {
  const rows: Array<{ y: number; items: PdfTextItem[] }> = [];
  const sorted = [...items].sort((a, b) => {
    const ay = pageHeight - a.transform[5];
    const by = pageHeight - b.transform[5];
    return ay - by || a.transform[4] - b.transform[4];
  });

  for (const item of sorted) {
    const y = pageHeight - item.transform[5];
    const row = rows.find((candidate) => Math.abs(candidate.y - y) <= Math.max(2.4, item.height * 0.38));
    if (row) row.items.push(item);
    else rows.push({ y, items: [item] });
  }

  return rows
    .sort((a, b) => a.y - b.y)
    .map((row) => row.items.sort((a, b) => a.transform[4] - b.transform[4]))
    .filter((row) => row.some((item) => item.str.trim().length > 0));
}

function itemsToBlocks(
  items: PdfTextItem[],
  styles: Record<string, PdfTextStyle> | undefined,
  pageWidth: number,
  pageHeight: number
): { blocks: DocumentBlock[]; textBlocks: number } {
  const scaleX = A4.width / pageWidth;
  const scaleY = A4.height / pageHeight;
  const groups = groupItems(items, pageWidth, pageHeight);
  const blocks: DocumentBlock[] = [];
  let textBlocks = 0;

  for (const group of groups) {
    const text = group.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const xPt = Math.min(...group.map((item) => item.transform[4]));
    const topPt = Math.min(...group.map((item) => pageHeight - item.transform[5] - item.height * 0.85));
    const rightPt = Math.max(...group.map((item) => item.transform[4] + item.width));
    const bottomPt = Math.max(...group.map((item) => pageHeight - item.transform[5] + item.height * 0.25));
    const x = Math.max(0, xPt * scaleX);
    const y = Math.max(0, topPt * scaleY);
    const width = Math.min(A4.width - x, Math.max(10, (rightPt - xPt) * scaleX + 1.8));
    const height = Math.min(A4.height - y, Math.max(3.2, (bottomPt - topPt) * scaleY + 1.2));

    // The bottom-right branding zone is redacted in the backdrop. Do not put
    // imported text back into it; the trusted layer is injected on export.
    const inBrandZone = x > A4.width * 0.67 && y > A4.height * 0.915;
    if (inBrandZone) continue;
    if (containsBrandingText(text) && y > A4.height * 0.82) continue;

    const cleaned = containsBrandingText(text) ? stripBrandingText(text) : text;
    if (!cleaned) continue;

    const tallest = Math.max(...group.map((item) => item.height));
    const fontSize = Math.min(40, Math.max(5, Math.round(tallest * 0.96 * 10) / 10));
    const fontFamily = fontFor(group[0], styles);

    blocks.push({
      id: newId("imported"),
      type: "freeText",
      placement: "free",
      html: `<span>${escapeHtml(cleaned)}</span>`,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      zIndex: 10,
      imported: true,
      fontFamily,
      fontSize,
      whiteBackground: true,
      color: "#111111",
    });
    textBlocks += 1;
  }

  return { blocks, textBlocks };
}

function redactBrandZone(context: CanvasRenderingContext2D, width: number, height: number): void {
  const zoneWidth = width * (46 / A4.width);
  const zoneHeight = height * (13 / A4.height);
  const right = width * (8 / A4.width);
  const bottom = height * (6 / A4.height);
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(width - right - zoneWidth - width * 0.012, height - bottom - zoneHeight - height * 0.006, zoneWidth + width * 0.02, zoneHeight + height * 0.014);
  context.restore();
}

export async function importPdfFile(
  file: File,
  onProgress?: (progress: PdfImportProgress) => void
): Promise<PdfImportResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pages: DocumentPage[] = [];
  let textBlocks = 0;
  let scannedPages = 0;

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      onProgress?.({ page: pageNumber, total: totalPages, phase: "rendering" });
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const unscaled = page.getViewport({ scale: 1 });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable in this browser.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, viewport }).promise;
      redactBrandZone(context, canvas.width, canvas.height);

      onProgress?.({ page: pageNumber, total: totalPages, phase: "reading" });
      const textContent = (await page.getTextContent()) as PdfTextContent;
      const items = textContent.items.filter((item): item is PdfTextItem => {
        return "str" in item && typeof item.str === "string";
      });
      if (items.filter((item) => item.str.trim()).length === 0) {
        scannedPages += 1;
      }
      const converted = itemsToBlocks(items, textContent.styles, unscaled.width, unscaled.height);
      textBlocks += converted.textBlocks;

      pages.push({
        id: newId("page"),
        blocks: converted.blocks,
        background: canvas.toDataURL("image/jpeg", 0.8),
        chrome: false,
        kind: "imported",
        drawings: [],
      });

      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  onProgress?.({ page: totalPages, total: totalPages, phase: "finalising" });

  const base = createSeedDocument();
  const title = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Imported paper";
  const doc: ExamDocument = {
    ...base,
    id: newId("doc"),
    title,
    meta: {
      ...base.meta,
      title,
      setLabel: "",
      maxMarks: 0,
    },
    pages,
    comments: [],
    changes: [],
    chrome: {
      ...base.chrome,
      showHeader: false,
      showFooter: false,
      showPageNumbers: false,
    },
  };

  return {
    document: touch(doc),
    pageCount: pages.length,
    textBlocks,
    scannedPages,
  };
}
