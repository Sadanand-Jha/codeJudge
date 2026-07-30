"use client";

import { useMemo } from "react";
import katex from "katex";

interface HtmlRendererProps {
  html: string;
  className?: string;
}

/**
 * Detects LaTeX math patterns in plain text and wraps them in $...$ delimiters.
 * Handles:
 * - Variables with subscripts: c_{i-1}, a_1, x_{n+1}
 * - Escaped braces: \{ and \} as literal set brackets
 * - Greek letters: \alpha, \beta, etc.
 * - Operators: \sum, \prod, \int, etc.
 * - Fractions: \frac{num}{den}
 * - Square roots: \sqrt{x}
 * - Comparison operators: \ge, \le, \neq, etc.
 */
function autoDelimitMath(text: string): string {
  // First, protect already-delimited math expressions from being matched again
  const protectedText = text.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g, (match) => {
    return match.replace(/./g, "\0");
  });

  // Pattern to match math expressions that need delimiting:
  // 1. Escaped braces: \{ or \}
  // 2. Variable with subscript/superscript: c_{i-1}, a^2, x_{n+1}^{k}, c_i
  // 3. LaTeX commands: \alpha, \ge, \sum, \frac, \sqrt
  const mathPattern = /(?:\\[{}]|[a-zA-Z0-9]+(?:_(?:[a-zA-Z0-9+\-*/()]|{[^}]*})|\^(?:[a-zA-Z0-9+\-*/()]|{[^}]*}))+|\\[a-zA-Z]+(?:{[^}]*})?)/g;

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(mathPattern, "g");

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    const protectedSlice = protectedText.slice(matchStart, matchEnd);
    const isProtected = protectedSlice.includes("\0");

    if (!isProtected) {
      result += text.slice(lastIndex, matchStart);
      result += `$${match[0]}$`;
      lastIndex = matchEnd;
    }
  }

  result += text.slice(lastIndex);

  return result;
}

/**
 * Renders HTML content with LaTeX math support using KaTeX.
 *
 * Features:
 * 1. Renders inline math ($...$) and display math ($$...$$) using KaTeX
 * 2. Auto-detects and wraps undelimited math expressions
 * 3. Handles subscripts, superscripts, groupings, escaped braces
 * 4. Falls back gracefully if KaTeX fails
 */
export default function HtmlRenderer({ html, className = "" }: HtmlRendererProps) {
  const renderedHtml = useMemo(() => {
    if (!html) return "";

    // Step 1: Auto-detect and delimit math expressions
    const preprocessed = autoDelimitMath(html);

    // Step 2: Replace math delimiters with rendered KaTeX HTML
    // First handle display math ($$...$$)
    let result = preprocessed.replace(/\$\$([\s\S]*?)\$\$/g, (_match, tex: string) => {
      try {
        return katex.renderToString(tex.trim(), {
          displayMode: true,
          throwOnError: false,
          strict: false,
        });
      } catch {
        return `<span class="math-error">${tex}</span>`;
      }
    });

    // Then handle inline math ($...$)
    result = result.replace(/\$([^$]+?)\$/g, (_match, tex: string) => {
      try {
        return katex.renderToString(tex.trim(), {
          displayMode: false,
          throwOnError: false,
          strict: false,
        });
      } catch {
        return `<span class="math-error">${tex}</span>`;
      }
    });

    return result;
  }, [html]);

  if (!html) return null;

  return (
    <div
      className={`problem-html ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}