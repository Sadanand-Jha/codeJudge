"use client";

import { cn } from "@/lib/helpers";

/**
 * Bank questions keep sanitized HTML (tables, <pre> blocks, lists…) as the
 * display source of truth — question_text is whitespace-collapsed for search.
 * Mirror of the platform question bank helpers, restyled for the qs UI.
 */

/** Flatten question HTML to plain text (edit / copy) with line breaks kept. */
export function htmlToEditableText(html: string): string {
  if (typeof window === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = template.content;
  root.querySelectorAll("br").forEach((el) => el.replaceWith(document.createTextNode("\n")));
  root.querySelectorAll("p, div, pre, blockquote, li, h1, h2, h3, h4, tr").forEach((el) => {
    el.prepend(document.createTextNode("\n"));
    el.append(document.createTextNode("\n"));
  });
  // Keep cell text apart when table markup is flattened to plain text.
  root.querySelectorAll("td, th").forEach((el) => el.append(document.createTextNode(" ")));
  return (root.textContent ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function preTextToTable(pre: HTMLPreElement): HTMLDivElement | null {
  const lines = (pre.textContent ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 3) return null;
  const rows = lines.map((line) => line.split(/\s{2,}|\t+/).map((cell) => cell.trim()).filter(Boolean));
  const cols = rows[0].length;
  if (cols < 2) return null;
  if (!rows.every((row) => row.length === cols)) return null;
  if (lines.some((line) => line.length > 80)) return null;

  const doc = pre.ownerDocument;
  const wrapper = doc.createElement("div");
  wrapper.className = "overflow-x-auto";
  const table = doc.createElement("table");
  const thead = doc.createElement("thead");
  const headRow = doc.createElement("tr");
  for (const cell of rows[0]) {
    const th = doc.createElement("th");
    th.textContent = cell;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = doc.createElement("tbody");
  for (const row of rows.slice(1)) {
    const tr = doc.createElement("tr");
    for (const cell of row) {
      const td = doc.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

/* Render-time only: swap a space-aligned <pre> block for a real <table> so
   data tables read as tables; stored HTML is never modified. */
export function renderQuestionHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("pre").forEach((pre) => {
    const table = preTextToTable(pre);
    if (table) pre.replaceWith(table);
  });
  const holder = document.createElement("div");
  holder.appendChild(template.content.cloneNode(true));
  return holder.innerHTML;
}

const QUESTION_HTML_CLASS = cn(
  "text-[17px] font-medium leading-relaxed text-[var(--qs-ink)]",
  "[&_p]:mb-2 [&_p:last-child]:mb-0",
  "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5",
  "[&_a]:text-[var(--qs-brand)] [&_a]:underline",
  "[&_strong]:font-extrabold [&_em]:italic [&_u]:underline",
  "[&_sup]:align-super [&_sup]:text-[0.75em] [&_sub]:align-sub [&_sub]:text-[0.75em]",
  "[&_code]:rounded [&_code]:bg-[var(--qs-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--qs-line)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--qs-muted)]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-[12px] [&_pre]:border-2 [&_pre]:border-[var(--qs-line)] [&_pre]:bg-[var(--qs-bg)] [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed",
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
  "[&_th]:border-2 [&_th]:border-[var(--qs-line)] [&_th]:bg-[var(--qs-bg)] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-extrabold [&_th]:uppercase [&_th]:tracking-[0.05em]",
  "[&_td]:border-2 [&_td]:border-[var(--qs-line)] [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top"
);

export function QuestionHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(QUESTION_HTML_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: renderQuestionHtml(html) }}
    />
  );
}
