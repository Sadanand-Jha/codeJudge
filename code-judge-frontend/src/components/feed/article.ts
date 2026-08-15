import type { FeedPost } from "@/data/developerFeed";

export interface TocItem {
  id: string;
  label: string;
  level: 2 | 3;
}

export interface ArticleSection {
  level: 2 | 3;
  heading: string;
  content: string;
}

export const slugifyHeading = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[’‘“”"!?.…,()]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

/**
 * Extract the h2/h3 headings from a markdown article body for the "On this
 * page" table of contents. Skips headings inside fenced code blocks so the
 * TOC only reflects real sections.
 */
export const parseToc = (body: string): TocItem[] => {
  const items: TocItem[] = [];
  let inFence = false;
  const lines = body.split("\n");
  for (const raw of lines) {
    if (/^\s*(?:```|~~~)/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+)\s*$/.exec(raw);
    if (!m) continue;
    const level = m[1].length;
    const label = m[2].trim().replace(/[#*`]/g, "").trim();
    items.push({ id: slugifyHeading(label), label, level: level === 3 ? 3 : 2 });
  }
  return items;
};

/**
 * Curated table of contents for the featured Dijkstra article so the left
 * rail matches the designed section list exactly. All other posts fall back
 * to headings parsed from their body.
 */
export const getArticleToc = (post: FeedPost): TocItem[] => {
  if (post.id === 1) {
    return [
      { id: "introduction", label: "Introduction", level: 2 },
      { id: "the-core-idea", label: "The Core Idea", level: 2 },
      { id: "a-mental-model", label: "Mental Model", level: 3 },
      { id: "step-by-step-example", label: "Step-by-Step Example", level: 2 },
      { id: "implementation", label: "Implementation", level: 2 },
      {
        id: slugifyHeading("Why if (d != dist[u]) continue;"),
        label: "Why if (d != dist[u]) continue;",
        level: 3,
      },
      { id: "complexity", label: "Complexity", level: 2 },
      { id: "visual-intuition", label: "Visual Intuition", level: 2 },
      { id: "common-mistakes", label: "Common Mistakes", level: 2 },
      { id: "final-takeaway", label: "Final Takeaway", level: 2 },
    ];
  }
  return parseToc(post.body);
};

/**
 * Split a markdown body into top-level h2/h3 sections, preserving the lead
 * prose that precedes the first heading. Fenced code blocks are skipped so
 * their contents are never mistaken for headings.
 */
export const splitMarkdownSections = (
  body: string
): { lead: string; sections: ArticleSection[] } => {
  const sections: ArticleSection[] = [];
  const leadLines: string[] = [];
  let current: { level: 2 | 3; heading: string; content: string[] } | null = null;
  let inFence = false;
  for (const raw of body.split("\n")) {
    if (/^\s*(?:```|~~~)/.test(raw)) {
      inFence = !inFence;
      (current ? current.content : leadLines).push(raw);
      continue;
    }
    if (inFence) {
      (current ? current.content : leadLines).push(raw);
      continue;
    }
    const m = /^(#{2,3})\s+(.+)\s*$/.exec(raw);
    if (m) {
      if (current) sections.push({ ...current, content: current.content.join("\n") });
      current = { level: m[1].length === 3 ? 3 : 2, heading: m[2], content: [] };
    } else {
      (current ? current.content : leadLines).push(raw);
    }
  }
  if (current) sections.push({ ...current, content: current.content.join("\n") });
  return { lead: leadLines.join("\n"), sections };
};

/** Remove inline diagram slots (e.g. `![diagram:dijkstra](#)`) from a section body. */
export const stripDiagramLine = (content: string): string =>
  content.replace(/!\[diagram:[^\]]*\]\([^)]*\)\s*/g, "");