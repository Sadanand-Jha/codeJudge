"use client";

import { useMemo } from "react";
import { renderMathInHtml } from "@/utils/mathText";

interface HtmlRendererProps {
  html: string;
  className?: string;
}

/**
 * Renders HTML content with LaTeX math support using KaTeX.
 * Undelimited math (e.g. s^2, c_{i-1}, \alpha) is auto-detected; explicit
 * $...$ and $$...$$ are rendered. Tags are never modified.
 */
export default function HtmlRenderer({ html, className = "" }: HtmlRendererProps) {
  const renderedHtml = useMemo(() => (html ? renderMathInHtml(html) : ""), [html]);

  if (!html) return null;

  return (
    <div
      className={`problem-html ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
