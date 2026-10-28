// Print-ready question-paper PDF rendering via a headless Chromium (Playwright).
// The HTML (fonts, layout, pagination-safe CSS) is produced by the frontend
// `paperHtml` builder; this service only turns it into an A4 PDF, injecting the
// repeated footer with real "Page X of Y" numbering.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";

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

export async function getPaperPdfBrowser(): Promise<Browser> {
  return getBrowser();
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

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const BRAND_LOGO_PATH = path.resolve(moduleDir, "../../public/logo/quizsupport-logo-light.png");
let cachedBrandLogo: string | null | undefined;

async function getBrandLogoDataUrl(): Promise<string | null> {
  if (cachedBrandLogo !== undefined) return cachedBrandLogo;
  try {
    const logo = await fs.readFile(BRAND_LOGO_PATH);
    cachedBrandLogo = `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    cachedBrandLogo = null;
  }
  return cachedBrandLogo;
}

function buildFooterTemplate(
  footer: PaperPdfFooter | undefined,
  fontCss: string | undefined,
  logo: string | null
): string {
  const left = escapeHtml(footer?.left ?? "");
  const right = escapeHtml(footer?.right ?? "");
  const style = fontCss ? `<style>${fontCss}</style>` : "";
  const logoImg = logo
    ? `<img src="${logo}" alt="QuizSupport" style="display:block;flex:0 0 auto;width:22mm;height:4.5mm;object-fit:contain;margin-left:3mm;" />`
    : "";
  return `${style}<div style="width:100%;padding:0 15mm;font-family:'Liberation Serif','Paper Devanagari',Times,serif;font-size:8.5pt;line-height:1.2;color:#000;">
  <div style="border-top:0.5pt solid #000;padding-top:1.3mm;display:flex;align-items:center;">
    <span style="flex:1;text-align:left;padding-right:4mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${left}</span>
    <span style="flex:1;text-align:center;white-space:nowrap;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    <span style="flex:1;text-align:right;padding-left:4mm;"></span>
    ${right ? `<span style="flex:0 0 auto;text-align:right;white-space:nowrap;margin-left:3mm;">${right}</span>` : ""}
    ${logoImg}
  </div>
</div>`;
}

const RENDER_TIMEOUT_MS = 60_000;

// A4 content box: 210mm − 2 × 15mm wide, 297mm − 15mm − 18mm tall.
const A4_CONTENT_WIDTH_PX = Math.round(((210 - 15 * 2) / 25.4) * 96);
const A4_CONTENT_HEIGHT_PX = Math.round(((297 - 15 - 18) / 25.4) * 96);

/**
 * Decide each question's option layout from measured text, not a character
 * count. Every word is wrapped in an inline span; a span with more than one
 * client rect has been split by the line breaker. We try the widest layout
 * first and step down 4 → 2 → 1 until every word stays on one line.
 *
 * Kept as a raw string because tsx/esbuild injects a __name helper into
 * serialized functions, which does not exist inside the browser page.
 */
const OPTION_LAYOUT_SCRIPT = String.raw`
(() => {
  var layoutClasses = ["opts-4", "opts-2", "opts-1"];

  var wrapWords = function (root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var value = node.nodeValue || "";
      if (!/[^\s]/.test(value)) continue;
      var fragment = document.createDocumentFragment();
      var parts = value.split(/(\s+)/);
      for (var j = 0; j < parts.length; j += 1) {
        var part = parts[j];
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
        } else {
          var word = document.createElement("span");
          word.className = "pdf-word";
          word.textContent = part;
          fragment.appendChild(word);
        }
      }
      node.parentNode.replaceChild(fragment, node);
    }
  };

  var hasSplitWord = function (opts) {
    var words = opts.querySelectorAll(".opt-text .pdf-word");
    for (var i = 0; i < words.length; i += 1) {
      var word = words[i];
      var rects = word.getClientRects();
      if (rects.length !== 1) return true;
      var text = word.closest(".opt-text");
      if (!text) continue;
      var bounds = text.getBoundingClientRect();
      var rect = rects[0];
      if (rect.width > 0 && (rect.right > bounds.right + 0.75 || rect.left < bounds.left - 0.75)) {
        return true;
      }
    }
    return false;
  };

  var optionGroups = document.querySelectorAll("[data-options]");
  for (var i = 0; i < optionGroups.length; i += 1) {
    var opts = optionGroups[i];
    var count = Number(opts.dataset.count || 0);
    var hasImages = opts.dataset.hasImages === "true";
    var candidates = hasImages
      ? ["opts-1"]
      : count === 4
        ? ["opts-4", "opts-2", "opts-1"]
        : count >= 2 && count <= 3
          ? ["opts-2", "opts-1"]
          : ["opts-1"];

    var texts = opts.querySelectorAll(".opt-text");
    for (var t = 0; t < texts.length; t += 1) wrapWords(texts[t]);

    var chosen = candidates[candidates.length - 1];
    for (var c = 0; c < candidates.length; c += 1) {
      var candidate = candidates[c];
      opts.classList.remove.apply(opts.classList, layoutClasses);
      opts.classList.add(candidate);
      opts.setAttribute("data-option-layout", candidate);
      void opts.offsetWidth;
      if (!hasSplitWord(opts)) {
        chosen = candidate;
        break;
      }
    }
    opts.setAttribute("data-option-layout", chosen);
  }
})();
`;

async function fitOptionLayouts(page: Page): Promise<void> {
  await page.evaluate(OPTION_LAYOUT_SCRIPT);
}

export async function renderPaperPdf(input: PaperPdfInput): Promise<Buffer> {
  const logo = await getBrandLogoDataUrl();
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);

    const work = (async () => {
      // Match the printable A4 content box so the measurement pass below sees
      // exactly the same line lengths as the final PDF.
      await page.setViewportSize({ width: A4_CONTENT_WIDTH_PX, height: A4_CONTENT_HEIGHT_PX });
      await page.emulateMedia({ media: "print" });
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

      await fitOptionLayouts(page);

      return page.pdf({
        printBackground: false,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: buildFooterTemplate(input.footer, input.fontCss, logo),
        preferCSSPageSize: true,
        tagged: true,
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
