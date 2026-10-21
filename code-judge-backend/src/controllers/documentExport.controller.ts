// Creator Studio document export endpoint. Branding is rebuilt server-side by
// the service; this controller only streams the trusted result.
import type { Request, Response, NextFunction } from "express";
import {
  DocumentExportError,
  exportDocument,
  type DocumentExportFormat,
} from "../services/documentExport.service.js";

export async function exportDocumentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as {
      document: unknown;
      format: DocumentExportFormat;
      pageIndex?: number;
      filename?: string;
    };
    const result = await exportDocument(body);

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.setHeader("Content-Length", String(result.buffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(result.buffer);
  } catch (error) {
    if (error instanceof DocumentExportError) {
      res.status(error.status).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
}
