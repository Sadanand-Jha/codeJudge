import apiClient from "@/lib/axios";
import type { ExamDocument } from "./types";

export type ServerExportFormat = "pdf" | "docx" | "html" | "png";

export function exportFilename(doc: ExamDocument, extension: string): string {
  const base = (doc.title || "question-paper")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "question-paper";
  return `${base}-set-${(doc.meta.setLabel || "a").toLowerCase()}.${extension}`;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export async function getDocumentExportError(error: unknown): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await data.text());
      if (parsed && typeof parsed === "object" && "message" in parsed) {
        return String((parsed as { message: unknown }).message);
      }
    } catch {
      // Non-JSON response.
    }
  }
  if (data && typeof data === "object" && "message" in data) {
    return String((data as { message: unknown }).message);
  }
  return "The export service could not build this file. Please try again.";
}

async function requestExport(
  doc: ExamDocument,
  format: ServerExportFormat,
  options: { pageIndex?: number; filename?: string } = {},
  responseType: "blob" | "text" = "blob"
): Promise<Blob | string> {
  const response = await apiClient.post(
    "/v1/user/document/export",
    {
      document: doc,
      format,
      pageIndex: options.pageIndex,
      filename: options.filename,
    },
    { responseType }
  );
  return response.data as Blob | string;
}

export async function downloadDocumentPdf(doc: ExamDocument): Promise<void> {
  const blob = (await requestExport(doc, "pdf", { filename: exportFilename(doc, "pdf") })) as Blob;
  saveBlob(blob, exportFilename(doc, "pdf"));
}

export async function downloadDocumentDocx(doc: ExamDocument): Promise<void> {
  const blob = (await requestExport(doc, "docx", { filename: exportFilename(doc, "docx") })) as Blob;
  saveBlob(blob, exportFilename(doc, "docx"));
}

export async function downloadDocumentPngs(doc: ExamDocument): Promise<number> {
  let count = 0;
  for (let pageIndex = 0; pageIndex < doc.pages.length; pageIndex += 1) {
    const blob = (await requestExport(doc, "png", { pageIndex, filename: exportFilename(doc, "png") })) as Blob;
    saveBlob(blob, exportFilename(doc, "png").replace(/\.png$/, `-page-${pageIndex + 1}.png`));
    count += 1;
  }
  return count;
}

function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    const cleanup = () => {
      window.setTimeout(() => iframe.remove(), 1200);
      resolve();
    };
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        cleanup();
      } catch {
        iframe.remove();
        reject(new Error("The print view could not be opened."));
      }
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

export async function printDocument(doc: ExamDocument): Promise<void> {
  const html = (await requestExport(doc, "html", {}, "text")) as string;
  await printHtml(html);
}

export async function exportDocument(
  doc: ExamDocument,
  format: "pdf" | "docx" | "png" | "print"
): Promise<number> {
  if (format === "pdf") {
    await downloadDocumentPdf(doc);
    return 1;
  }
  if (format === "docx") {
    await downloadDocumentDocx(doc);
    return 1;
  }
  if (format === "png") {
    return downloadDocumentPngs(doc);
  }
  await printDocument(doc);
  return 1;
}
