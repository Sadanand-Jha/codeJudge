import type { FindOptions } from "./types";

export function buildFindRegex(options: FindOptions): RegExp | null {
  if (!options.query) return null;
  const base = options.regex
    ? options.query
    : options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = options.wholeWord ? `\\b(?:${base})\\b` : base;
  try {
    return new RegExp(pattern, options.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

/**
 * Replaces text only in text nodes, never in tag names or attributes. This
 * keeps rich formatting intact and — critically — cannot fabricate or remove
 * the protected branding layer (which is not part of any block HTML).
 */
export function replaceInHtml(
  html: string,
  options: Pick<FindOptions, "regex" | "caseSensitive" | "wholeWord">,
  query: string,
  replacement: string
): { html: string; count: number } {
  const regex = buildFindRegex({ ...options, query, replacement });
  if (!regex) return { html, count: 0 };
  const container = window.document.createElement("div");
  container.innerHTML = html;
  const walker = window.document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  let count = 0;
  for (const node of nodes) {
    const value = node.nodeValue ?? "";
    const next = value.replace(regex, () => {
      count += 1;
      return replacement;
    });
    if (next !== value) node.nodeValue = next;
  }
  return { html: container.innerHTML, count };
}

export function countInHtml(html: string, options: FindOptions): number {
  const regex = buildFindRegex(options);
  if (!regex) return 0;
  const container = window.document.createElement("div");
  container.innerHTML = html;
  const text = container.textContent ?? "";
  return [...text.matchAll(regex)].length;
}
