// Renders the invoice HTML into an A4 PDF using the shared headless Chromium
// instance from paperPdf.service. The HTML is fully self-contained, so no
// external assets are required at render time.
import { getPaperPdfBrowser } from "./paperPdf.service.ts";

const RENDER_TIMEOUT_MS = 60_000;

export async function renderInvoicePdf(html: string): Promise<Buffer> {
  const browser = await getPaperPdfBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    await page.setContent(html, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await context.close().catch(() => {});
  }
}
