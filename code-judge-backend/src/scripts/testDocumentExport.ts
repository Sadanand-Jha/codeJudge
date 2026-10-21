// Acceptance test for the Creator Studio trusted exporter. Builds a two-page
// paper, exercises HTML/PDF/PNG/DOCX, verifies branding is re-injected, and
// proves floating content over the safe zone is rejected.
import assert from "node:assert/strict";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  assertBrandingHtmlContract,
  buildDocumentHtml,
  DocumentExportError,
  exportDocument,
  type ExportDocument,
} from "../services/documentExport.service.js";
import { closePaperPdfBrowser } from "../services/paperPdf.service.js";

const document: ExportDocument = {
  title: "ADA Assignment Testing",
  meta: { title: "ADA Assignment Testing", institution: "Department of Computer Science", subject: "Analysis and Design of Algorithms", timeAllowed: "90 minutes", maxMarks: 20, setLabel: "A" },
  settings: {
    pageSize: "A4",
    orientation: "portrait",
    margins: { top: 18, right: 16, bottom: 16, left: 16 },
    columns: 1,
    defaultFontFamily: "Times New Roman",
    defaultFontSize: 11,
    lineHeight: 1.45,
  },
  chrome: {
    headerHtml: "<p><strong>ADA Assignment Testing</strong></p>",
    footerLeftHtml: "<p>Department of Computer Science</p>",
    showHeader: true,
    showFooter: true,
    showPageNumbers: true,
    showOnFirstPage: true,
  },
  pages: [
    {
      kind: "flow",
      chrome: true,
      drawings: [{ tool: "pen", color: "#1a1240", width: 0.45, opacity: 1, points: [{ x: 20, y: 20 }, { x: 40, y: 30 }] }],
      blocks: [
        { type: "heading", placement: "flow", level: 1, html: "<p>ADA Assignment Testing</p>" },
        { type: "instructions", placement: "flow", html: "<p>Answer all questions. Show your work. Impostor QuizSupport text.</p>" },
        { type: "section", placement: "flow", html: "<p>Section A — Fundamentals</p>", marks: 10 },
        { type: "question", placement: "flow", questionNumber: 1, marks: 5, html: "<p>Explain the time complexity of merge sort.</p>" },
        { type: "question", placement: "flow", questionNumber: 2, marks: 5, html: "<p>Compare BFS and DFS with an example.</p>" },
        { type: "table", placement: "flow", html: "<table><thead><tr><th>Algorithm</th><th>Complexity</th></tr></thead><tbody><tr><td>Quick sort</td><td>O(n log n)</td></tr></tbody></table>" },
        { type: "equation", placement: "flow", latex: "T(n)=2T(n/2)+O(n)" },
      ],
    },
    {
      kind: "flow",
      chrome: true,
      drawings: [],
      blocks: [
        { type: "question", placement: "flow", questionNumber: 3, marks: 10, html: "<p>Design an O(n) algorithm to find the missing number.</p>" },
      ],
    },
  ],
};

async function main(): Promise<void> {
  const html = buildDocumentHtml(document);
  assertBrandingHtmlContract(html, 2);
  assert.equal(html.includes("Impostor QuizSupport"), false, "editable content must not be able to impersonate the brand");

  const pdf = await exportDocument({ document, format: "pdf" });
  assert.equal(pdf.buffer.subarray(0, 5).toString(), "%PDF-");
  const loadingTask = getDocument({ data: new Uint8Array(pdf.buffer), useWorkerFetch: false, useSystemFonts: true });
  const pdfFile = await loadingTask.promise;
  assert.equal(pdfFile.numPages, 2, "PDF must keep one page per document page");
  await loadingTask.destroy();

  const png = await exportDocument({ document, format: "png", pageIndex: 1 });
  assert.equal(png.buffer.subarray(1, 4).toString(), "PNG");
  assert.match(png.filename, /page-2\.png$/);

  const docx = await exportDocument({ document, format: "docx" });
  assert.equal(docx.buffer.subarray(0, 2).toString(), "PK");
  assert.ok(docx.buffer.includes(Buffer.from("word/footer1.xml")), "DOCX must carry a page footer with branding");

  const htmlExport = await exportDocument({ document, format: "html" });
  assert.equal(htmlExport.contentType, "text/html; charset=utf-8");
  assert.equal(htmlExport.buffer.toString("utf8").includes('data-qs-protected-branding="true"'), true);

  const blocked = structuredClone(document);
  blocked.pages![0].blocks!.push({
    type: "freeText",
    placement: "free",
    x: 160,
    y: 280,
    width: 40,
    height: 15,
    html: "<p>Cover the footer</p>",
  });
  await assert.rejects(
    () => exportDocument({ document: blocked, format: "html" }),
    (error: unknown) => error instanceof DocumentExportError && error.status === 422
  );

  console.log("Document export acceptance: HTML, PDF (2 pages), PNG, DOCX and branding rejection passed.");
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePaperPdfBrowser());
