/**
 * Helpers for quiz content that may be stored either as plain text or as
 * sanitized HTML (the AI generation pipeline returns both `question`/`options`
 * as plain text and `questionHtml`/`optionsHtml` as formatted HTML).
 */

const HTML_TAG_PATTERN =
  /<\/?(?:p|div|span|strong|b|em|i|u|s|br|hr|ul|ol|li|h[1-6]|pre|code|table|thead|tbody|tfoot|tr|th|td|blockquote|sup|sub|a)\b[^>]*>/i;

/** True when the value looks like it contains a supported HTML tag. */
export function containsHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return HTML_TAG_PATTERN.test(value);
}

function decodeCodePoint(code: number): string {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

/**
 * Decode the common HTML entities found in stored quiz text so they render as
 * real characters instead of literal `&nbsp;`-style text.
 */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, "\u00A0")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "’")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => decodeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => decodeCodePoint(parseInt(code, 10)));
}

/** Flatten HTML into readable plain text (used for editing and matching). */
export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return "";
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<\/(td|th)>/gi, " ")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/\u00A0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
