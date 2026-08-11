/**
 * Extracts the rendered (displayed) text from a DOM subtree so copying an AI
 * message yields what the user actually sees — not the raw Markdown source
 * (no `**`, `*`, backticks, `#`, `[text](url)`, fences, …).
 *
 * The walker mirrors how the browser renders HTML text:
 *  - block-level elements are separated by newlines
 *  - runs of inline whitespace collapse to a single space
 *  - <pre> (code blocks) text is preserved verbatim, without fences
 *  - UI chrome (buttons, icons, code-block headers) is skipped
 */
const BLOCK_TAGS = new Set([
  "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6",
  "LI", "UL", "OL", "BLOCKQUOTE", "PRE", "TABLE", "THEAD", "TBODY",
  "TR", "HR", "BR", "SECTION", "ARTICLE", "FIGURE", "DL", "DT", "DD",
]);

const SKIP_TAGS = new Set([
  "BUTTON", "SVG", "SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "OPTION",
]);

export function extractRenderedText(root: HTMLElement | null | undefined): string {
  if (!root) return "";
  const parts: string[] = [];

  const blockBreak = () => {
    if (parts.length > 0 && parts[parts.length - 1] !== "\n") {
      parts.push("\n");
    }
  };

  const walk = (node: Node, inPre: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (inPre) {
        parts.push(text);
      } else {
        const collapsed = text.replace(/\s+/g, " ");
        if (collapsed) parts.push(collapsed);
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (SKIP_TAGS.has(tag)) return;
    if (el.getAttribute("aria-hidden") === "true") return;
    if (el.hasAttribute("data-copy-skip")) return;

    if (tag === "PRE") {
      const code = el.querySelector("code") ?? el;
      const text = (code.textContent ?? "").replace(/^\n+/, "").replace(/\n+$/, "");
      blockBreak();
      parts.push(text);
      blockBreak();
      return;
    }
    if (tag === "BR") {
      blockBreak();
      return;
    }
    if (tag === "IMG") {
      const alt = el.getAttribute("alt") ?? "";
      if (alt) parts.push(alt);
      return;
    }

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) blockBreak();
    for (const child of Array.from(el.childNodes)) walk(child, inPre);
    if (isBlock) blockBreak();
    if (tag === "TH" || tag === "TD") {
      parts.push(" ");
    }
  };

  walk(root, false);

  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
