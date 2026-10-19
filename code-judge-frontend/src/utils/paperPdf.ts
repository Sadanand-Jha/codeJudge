// Client-side downloader for the print-ready question paper / answer key.
// Builds the HTML (paperHtml) and asks the backend /paper-pdf endpoint to
// render it with headless Chromium.
import apiClient from "@/lib/axios";
import {
  buildAnswerKeyDocument,
  buildPaperDocument,
  loadPaperFontCss,
  paperFooterLeft,
  preparePaperQuestions,
  type PaperMeta,
  type PaperOptions,
  type PaperQuestion,
  type PaperStudent,
} from "@/utils/paperHtml";

export type PaperDownloadMode = "single" | "individual" | "combined";
export type PaperDownloadKind = "paper" | "key";

export interface DownloadPaperInput {
  meta: PaperMeta;
  questions: PaperQuestion[];
  options: PaperOptions;
  mode: PaperDownloadMode;
  students?: PaperStudent[];
}

const slug = (value: string): string =>
  value
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "quiz";

async function requestPdf(
  html: string,
  footer: { left: string; right: string },
  filename: string,
  fontCss: string
): Promise<Blob> {
  const response = await apiClient.post(
    "/v1/user/quiz/paper-pdf",
    { html, footer, filename, fontCss },
    { responseType: "blob" }
  );
  return response.data as Blob;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function getPaperPdfErrorMessage(error: unknown): Promise<string> {
  const response = (error as { response?: { data?: unknown } })?.response;
  const data = response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) return String(parsed.message);
    } catch {
      // not a JSON error body
    }
  }
  return "Something went wrong while building the question paper.";
}

export async function downloadQuizPaperPdf(input: DownloadPaperInput, kind: PaperDownloadKind): Promise<number> {
  const fontCss = await loadPaperFontCss();
  const questions = preparePaperQuestions(input.questions, input.options);
  const base = slug(input.meta.title || "quiz");
  const footerLeft = paperFooterLeft(input.meta);
  const footerRight = input.meta.setName?.trim() || "";

  if (kind === "key") {
    const filename = `${base}-answer-key.pdf`;
    const html = buildAnswerKeyDocument({ meta: input.meta, questions }, fontCss);
    saveBlob(await requestPdf(html, { left: footerLeft, right: footerRight }, `${base}-answer-key`, fontCss), filename);
    return 1;
  }

  if (input.mode === "individual" && input.students?.length) {
    let count = 0;
    for (const student of input.students) {
      const html = buildPaperDocument(
        { meta: input.meta, questions, options: input.options, students: [student] },
        fontCss
      );
      const suffix = slug(student.name || student.username || student.rollNo || String(student.id ?? count + 1));
      saveBlob(await requestPdf(html, { left: footerLeft, right: footerRight }, `${base}-${suffix}`, fontCss), `${base}-${suffix}.pdf`);
      count += 1;
    }
    return count;
  }

  const students = input.mode === "combined" && input.students?.length ? input.students : null;
  const filename = `${base}${input.mode === "combined" ? "-combined" : "-question-paper"}.pdf`;
  const html = buildPaperDocument({ meta: input.meta, questions, options: input.options, students }, fontCss);
  saveBlob(await requestPdf(html, { left: footerLeft, right: footerRight }, filename.replace(/\.pdf$/, ""), fontCss), filename);
  return 1;
}
