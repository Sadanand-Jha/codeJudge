"use client";

interface SafeHTMLProps {
  html: string;
  className?: string;
}

export default function SafeHTML({ html, className = "" }: SafeHTMLProps) {
  // The HTML is stored in the database and should be rendered as-is
  // This preserves all formatting including paragraphs, lists, code blocks, etc.
  return (
    <div
      className={`prose-premium ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}