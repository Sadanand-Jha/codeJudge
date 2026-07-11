"use client";

interface SafeHTMLProps {
  html: string;
  className?: string;
}

export default function SafeHTML({ html, className = "" }: SafeHTMLProps) {
  return (
    <div
      className={`prose prose-invert max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-a:text-blue-400 prose-strong:text-zinc-200 prose-code:text-zinc-200 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-li:text-zinc-300 prose-ol:text-zinc-300 prose-ul:text-zinc-300 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}