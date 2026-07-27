"use client";

import { useMemo } from "react";
import { InlineMath, BlockMath } from "react-katex";
import { parseMath, MathSegment } from "@/lib/mathParser";

interface MathRendererProps {
  /** Raw HTML content (e.g., problem statement) that may contain $...$ and $$...$$ math */
  html: string;
  className?: string;
}

/**
 * Renders HTML content with embedded LaTeX math rendered via KaTeX.
 *
 * How it works:
 * 1. Calls parseMath(html) to tokenize the content
 * 2. Maps over parsed tokens
 * 3. Renders inline-math with <InlineMath>, block-math with <BlockMath>
 * 4. Renders text with dangerouslySetInnerHTML
 *
 * Handles:
 * - Block math: $$...$$
 * - Inline math: $...$
 * - Non-standard $$$ delimiters (normalized)
 * - Escaped \$ (left as literal $ in output)
 * - Macros: \texttt, \color{red}, \RR, \ZZ, etc.
 */

// Shared KaTeX config with macro support for common CP notation
const KATEX_CONFIG = {
  throwOnError: false,
  trust: true,
  macros: {
    "\\RR": "\\mathbb{R}",
    "\\ZZ": "\\mathbb{Z}",
    "\\NN": "\\mathbb{N}",
    "\\CC": "\\mathbb{C}",
    "\\QQ": "\\mathbb{Q}",
    "\\PP": "\\mathbb{P}",
    "\\EE": "\\mathbb{E}",
    "\\MM": "\\mathcal{M}",
    "\\OO": "\\mathcal{O}",
    "\\texttt": "\\mathtt",
    "\\color": "\\textcolor",
  },
};

export default function MathRenderer({ html, className = "" }: MathRendererProps) {
  const segments = useMemo(() => parseMath(html), [html]);

  return (
    <div className={`problem-html ${className}`}>
      {segments.map((segment: MathSegment, index: number) => {
        switch (segment.type) {
          case "inline-math":
            return (
              <InlineMath
                key={index}
                math={segment.content}
                {...KATEX_CONFIG}
              />
            );
          case "block-math":
            return (
              <BlockMath
                key={index}
                math={segment.content}
                {...KATEX_CONFIG}
              />
            );
          case "text":
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: segment.content }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}