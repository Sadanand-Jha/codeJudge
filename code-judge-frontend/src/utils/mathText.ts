import katex from "katex";

/**
 * Shared math rendering for quiz text. Handles:
 * - explicit delimiters: $...$ (inline) and $$...$$ (display)
 * - undelimited expressions such as `s^2`, `c_{i-1}`, `\alpha`, `\{ x \}`
 *
 * Plain text is HTML-escaped outside math; HTML text nodes are left as-is
 * (tags are never touched).
 */

const MATH_PATTERN =
  /(?:\\[{}]|[a-zA-Z0-9]+(?:_(?:[a-zA-Z0-9+\-*/()]|{[^}]*})|\^(?:[a-zA-Z0-9+\-*/()]|{[^}]*}))+|\\[a-zA-Z]+(?:{[^}]*})?)/g;

const DELIMITED_MATH = /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;

/** Wrap undelimited math expressions in $...$, leaving existing $...$ untouched. */
export function autoDelimitMath(text: string): string {
  const protectedText = text.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g, (match) =>
    match.replace(/./g, "\0")
  );

  let result = "";
  let lastIndex = 0;
  const regex = new RegExp(MATH_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (!protectedText.slice(start, end).includes("\0")) {
      result += text.slice(lastIndex, start);
      result += `$${match[0]}$`;
      lastIndex = end;
    }
  }
  return result + text.slice(lastIndex);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTex(tex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(tex.trim(), { displayMode, throwOnError: false, strict: false });
  } catch {
    return null;
  }
}

/**
 * Render a text run containing math. When `escape` is true the non-math text is
 * HTML-escaped (use for plain text); otherwise it is emitted as-is (HTML text).
 */
export function renderMathText(text: string, escape: boolean): string {
  const source = autoDelimitMath(text);
  const plain = (s: string) => (escape ? escapeHtml(s) : s);
  const regex = new RegExp(DELIMITED_MATH.source, "g");

  let out = "";
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    out += plain(source.slice(last, match.index));
    const display = match[1] !== undefined;
    const tex = display ? match[1] : match[2];
    out += renderTex(tex, display) ?? plain(match[0]);
    last = match.index + match[0].length;
  }
  return out + plain(source.slice(last));
}

/** Render plain (non-HTML) text: escaped, with math typeset. */
export function renderPlainMathHtml(text: string): string {
  return renderMathText(text, true);
}

/** True when plain text contains anything that would be typeset as math. */
export function looksLikeMath(text: string | null | undefined): boolean {
  if (!text) return false;
  return renderPlainMathHtml(text) !== escapeHtml(text);
}

/** Render HTML: math is typeset in text nodes only; tags are preserved. */
export function renderMathInHtml(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part, i) => (i % 2 === 1 ? part : renderMathText(part, false)))
    .join("");
}
