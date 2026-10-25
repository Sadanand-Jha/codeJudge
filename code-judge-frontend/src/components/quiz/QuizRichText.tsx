"use client";

import { useMemo } from "react";
import { cn } from "@/lib/helpers";
import { renderQuestionHtml } from "@/components/creator/questions/QuestionHtml";
import { containsHtml } from "@/utils/htmlText";

const RICH_TEXT_CLASS = cn(
  "break-words",
  "[&_p]:mb-1 [&_p:last-child]:mb-0",
  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5",
  "[&_a]:text-[var(--qs-brand)] [&_a]:underline",
  "[&_strong]:font-bold [&_em]:italic [&_u]:underline",
  "[&_sup]:align-super [&_sup]:text-[0.75em] [&_sub]:align-sub [&_sub]:text-[0.75em]",
  "[&_code]:rounded [&_code]:bg-black/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--qs-line)] [&_blockquote]:pl-3",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[var(--qs-line)] [&_pre]:bg-[var(--qs-bg)] [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[13px]",
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
  "[&_th]:border [&_th]:border-[var(--qs-line)] [&_th]:bg-[var(--qs-bg)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_td]:border [&_td]:border-[var(--qs-line)] [&_td]:px-2 [&_td]:py-1 [&_td]:align-top"
);

interface QuizRichTextProps {
  html?: string | null;
  className?: string;
  as?: "div" | "span";
}

/**
 * Renders AI-generated quiz HTML (tables, lists, code blocks…) as parsed
 * markup, while falling back to plain text when the value has no tags.
 */
export function QuizRichText({ html, className, as = "div" }: QuizRichTextProps) {
  const value = html ?? "";
  const hasHtml = containsHtml(value);
  const rendered = useMemo(
    () => (hasHtml ? renderQuestionHtml(value) : value),
    [hasHtml, value]
  );

  const Tag = as;
  if (!hasHtml) {
    return <Tag className={cn("whitespace-pre-wrap break-words", className)}>{value}</Tag>;
  }

  return (
    <Tag
      className={cn(RICH_TEXT_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
