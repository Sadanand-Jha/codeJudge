// Question-paper PDF endpoint. Receives a fully-styled print HTML document
// (built client-side by the paper builder) and streams back an A4 PDF.
import type { Request, Response, NextFunction } from "express";
import { renderPaperPdf } from "../services/paperPdf.service.ts";

const safeFilename = (value: string | undefined): string => {
  const cleaned = (value || "question-paper").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${cleaned || "question-paper"}.pdf`;
};

export async function renderPaperPdfController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { html, footer, fontCss, filename } = req.body as {
      html: string;
      footer?: { left?: string; right?: string };
      fontCss?: string;
      filename?: string;
    };

    const pdf = await renderPaperPdf({ html, footer, fontCss });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(filename)}"`);
    res.setHeader("Content-Length", String(pdf.length));
    res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
}
