// Print-ready question-paper PDF rendering via a headless Chromium (Playwright).
// The HTML (fonts, layout, pagination-safe CSS) is produced by the frontend
// `paperHtml` builder; this service only turns it into an A4 PDF, injecting the
// repeated footer with real "Page X of Y" numbering.
import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  const base = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  };
  try {
    // Prefer the Playwright-bundled Chromium when browsers are installed.
    return await chromium.launch(base);
  } catch {
    // Fall back to a system Chrome/Chromium install (e.g. google-chrome).
    return await chromium.launch({ ...base, channel: "chrome" });
  }
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

export async function closePaperPdfBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = null;
  if (!pending) return;
  try {
    const browser = await pending;
    await browser.close();
  } catch {
    // Browser already gone — nothing to clean up.
  }
}

// tsx watch restarts would otherwise leave a headless Chrome behind.
process.once("SIGINT", () => void closePaperPdfBrowser());
process.once("SIGTERM", () => void closePaperPdfBrowser());

export interface PaperPdfFooter {
  left?: string;
  right?: string;
}

export interface PaperPdfInput {
  html: string;
  footer?: PaperPdfFooter;
  /** @font-face CSS (base64 data URLs) reused inside the footer template. */
  fontCss?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function buildFooterTemplate(footer: PaperPdfFooter | undefined, fontCss?: string): string {
  const left = escapeHtml(footer?.left ?? "");
  const right = escapeHtml(footer?.right ?? "");
  const style = fontCss ? `<style>${fontCss}</style>` : "";
  return `${style}<div style="width:100%;padding:0 20mm;font-family:'Times New Roman','Liberation Serif',Times,serif;font-size:9pt;color:#000;">
  <div style="border-top:0.5pt solid #000;padding-top:1.6mm;display:flex;align-items:center;">
    <span style="flex:1;text-align:left;padding-right:4mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${left}</span>
    <span style="flex:1;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    <span style="flex:1;text-align:right;padding-left:4mm;">${right}</span>
  </div>
</div>`;
}

const RENDER_TIMEOUT_MS = 60_000;

export async function renderPaperPdf(input: PaperPdfInput): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);

    const work = (async () => {
      await page.setContent(input.html, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
      // Web fonts are data URLs (already loaded at document load); make sure
      // text layout uses them before printing.
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      // Give external question images a bounded chance to load; never fail on them.
      await page
        .evaluate(
          () =>
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
        )
        .catch(() => {});

      return page.pdf({
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: buildFooterTemplate(input.footer, input.fontCss),
        preferCSSPageSize: true,
      });
    })();

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PDF rendering timed out")), RENDER_TIMEOUT_MS + 5_000)
    );

    return Buffer.from(await Promise.race([work, timeout]));
  } finally {
    await context.close().catch(() => {});
  }
}
