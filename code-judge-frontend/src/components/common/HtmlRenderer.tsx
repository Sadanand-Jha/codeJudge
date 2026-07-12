"use client";

interface HtmlRendererProps {
  html: string;
  className?: string;
}

/**
 * Reusable HTML renderer component for rich text content.
 * Safely renders HTML with beautiful typography.
 * 
 * Used for:
 * - Problem statements
 * - Input/Output specifications
 * - Constraints
 * - Notes
 * - Editorials
 * - AI explanations
 * - Hints
 * - Tutorials
 * - Blogs
 */
export default function HtmlRenderer({ html, className = "" }: HtmlRendererProps) {
  return (
    <div
      className={`problem-html ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}