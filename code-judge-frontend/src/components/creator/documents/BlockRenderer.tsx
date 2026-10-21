"use client";

import { useRef } from "react";
import { MessageSquare, Sigma } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { CSSProperties } from "react";
import type { DocumentBlock } from "@/lib/documentEditor/types";
import { cn } from "@/lib/helpers";
import { RichText } from "./RichText";

function safeKatex(latex: string): string {
  try {
    return katex.renderToString(latex || "\\text{Equation}", {
      displayMode: true,
      throwOnError: false,
      strict: "ignore",
    });
  } catch {
    return `<span class="text-xs text-[var(--qs-muted)]">Invalid equation</span>`;
  }
}

export function BlockRenderer({
  block,
  editable,
  questionNumber,
  sectionMarks,
  commentCount,
  onChangeHtml,
  onPatch,
  onFocus,
  onBlur,
  onSelect,
}: {
  block: DocumentBlock;
  editable: boolean;
  questionNumber: number;
  sectionMarks: number;
  commentCount: number;
  onChangeHtml: (html: string) => void;
  onPatch: (patch: Partial<DocumentBlock>) => void;
  onFocus?: () => void;
  onBlur?: (before: string, after: string) => void;
  onSelect?: () => void;
}) {
  const focusHtml = useRef(block.html);
  const commonRich = {
    html: block.html,
    onChange: onChangeHtml,
    onFocus: () => {
      focusHtml.current = block.html;
      onFocus?.();
    },
    onBlur: (html: string) => onBlur?.(focusHtml.current, html),
    editable,
    ariaLabel: `${block.type} block`,
  };

  if (block.type === "section") {
    return (
      <div
        className="doc-section flex items-end justify-between gap-4 border-b-[1.5px] border-[#1a1240] pb-[2mm]"
        onMouseDown={onSelect}
      >
        <RichText {...commonRich} className="min-w-0 flex-1" />
        <span className="shrink-0 pb-[1mm] text-[9pt] font-bold text-[#5c5679]">
          {sectionMarks} marks
        </span>
      </div>
    );
  }

  if (block.type === "question") {
    return (
      <div className="doc-question group/q relative" data-question-block={block.id} style={{ lineHeight: block.lineHeight }}>
        <div className="flex items-start gap-[3mm]">
          <span className="mt-[0.35em] shrink-0 text-[10.5pt] font-bold text-[#1a1240]" aria-hidden="true">
            Q{questionNumber}.
          </span>
          <div className="min-w-0 flex-1">
            <RichText {...commonRich} placeholder="Type the question…" />
          </div>
          <div className="flex shrink-0 items-center gap-[1mm] pt-[0.2em]">
            {editable ? (
              <input
                aria-label={`Marks for question ${questionNumber}`}
                type="number"
                min={0}
                step={0.5}
                value={Number.isFinite(block.marks) ? block.marks : 0}
                onChange={(event) => onPatch({ marks: Math.max(0, Number(event.target.value) || 0) })}
                onMouseDown={(event) => event.stopPropagation()}
                className="w-[9mm] rounded-[1mm] border border-transparent bg-transparent px-[0.7mm] py-[0.3mm] text-right text-[9pt] font-bold text-[#1a1240] outline-none hover:border-[#d8d2ef] focus:border-[var(--qs-brand)] focus:bg-white"
              />
            ) : (
              <span className="text-[9pt] font-bold text-[#1a1240]">{block.marks ?? 0}</span>
            )}
            <span className="text-[7.5pt] font-semibold uppercase tracking-wide text-[#8b86a3]">marks</span>
          </div>
        </div>
        {commentCount > 0 && (
          <span
            className="absolute -right-[4mm] top-0 grid h-[5mm] w-[5mm] place-items-center rounded-full bg-[#ffd23f] text-[6.5pt] font-black text-[#1a1240] shadow-sm"
            title={`${commentCount} comment${commentCount === 1 ? "" : "s"}`}
            aria-label={`${commentCount} comments`}
          >
            {commentCount}
          </span>
        )}
      </div>
    );
  }

  if (block.type === "instructions") {
    return (
      <div
        className="doc-instructions rounded-[1.5mm] border-[1.3pt] border-[#1a1240] bg-[#fbfaff] px-[5mm] py-[3.4mm]"
        style={{ boxShadow: "1.5mm 1.5mm 0 rgba(255,210,63,.45)" }}
        onMouseDown={onSelect}
      >
        <RichText {...commonRich} />
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div className="doc-table" onMouseDown={onSelect}>
        <RichText {...commonRich} placeholder="Insert a table to start editing cells…" />
      </div>
    );
  }

  if (block.type === "divider") {
    return (
      <div className="py-[2mm]" onMouseDown={onSelect}>
        <div className="h-[1.2pt] w-full bg-[#1a1240]" />
      </div>
    );
  }

  if (block.type === "image" || block.type === "signature") {
    return (
      <div className="doc-image" onMouseDown={onSelect}>
        {block.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.src}
            alt={block.alt || (block.type === "signature" ? "Signature" : "Inserted image")}
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full min-h-[20mm] w-full place-items-center rounded-[1.5mm] border border-dashed border-[#b9b1dc] bg-[#faf9ff] text-[8pt] text-[#8b86a3]">
            {block.type === "signature" ? "Signature" : "Image"}
          </div>
        )}
      </div>
    );
  }

  if (block.type === "shape") {
    return (
      <div
        className="h-full w-full"
        style={{
          border: block.shape === "line" ? "none" : `${block.borderWidth ?? 1.3}pt solid ${block.borderColor ?? "#1a1240"}`,
          borderTop: block.shape === "line" ? `${block.borderWidth ?? 1.3}pt solid ${block.borderColor ?? "#1a1240"}` : undefined,
          borderRadius: block.shape === "ellipse" ? "999px" : "1.5mm",
          background: block.background ?? "transparent",
        }}
        onMouseDown={onSelect}
      />
    );
  }

  if (block.type === "field") {
    return (
      <div className="doc-field flex items-end gap-[2mm] text-[10pt]" onMouseDown={onSelect}>
        <span className="shrink-0 font-semibold text-[#1a1240]">{block.fieldLabel || "Field"}:</span>
        {editable ? (
          <input
            aria-label={block.fieldLabel || "Form field"}
            value={block.fieldValue ?? ""}
            onChange={(event) => onPatch({ fieldValue: event.target.value })}
            onMouseDown={(event) => event.stopPropagation()}
            className="min-w-0 flex-1 border-b border-[#1a1240] bg-transparent px-[1mm] pb-[0.6mm] text-[10pt] outline-none focus:border-[var(--qs-brand)]"
            placeholder="____________________________"
          />
        ) : (
          <span className="min-w-0 flex-1 border-b border-[#1a1240] px-[1mm] pb-[0.6mm]">
            {block.fieldValue || "____________________________"}
          </span>
        )}
      </div>
    );
  }

  if (block.type === "equation") {
    return (
      <div className="doc-equation flex items-center gap-[3mm]" onMouseDown={onSelect}>
        <Sigma className="h-[4mm] w-[4mm] shrink-0 text-[#8b86a3]" aria-hidden="true" />
        {editable ? (
          <input
            value={block.latex ?? ""}
            onChange={(event) => onPatch({ latex: event.target.value })}
            onMouseDown={(event) => event.stopPropagation()}
            placeholder="\\frac{a}{b}"
            aria-label="LaTeX equation"
            className="min-w-0 flex-1 rounded-[1mm] border border-[#e0dbf5] bg-white px-[2mm] py-[1mm] font-mono text-[8pt] outline-none focus:border-[var(--qs-brand)]"
          />
        ) : null}
        <div className="min-w-0 flex-1" dangerouslySetInnerHTML={{ __html: safeKatex(block.latex ?? "") }} />
      </div>
    );
  }

  if (block.type === "note") {
    return (
      <div
        className="rounded-[1.5mm] border border-[#e7c94a] bg-[#fff8cc] px-[3mm] py-[2.5mm] text-[9pt] shadow-sm"
        onMouseDown={onSelect}
      >
        <div className="mb-[1mm] flex items-center gap-[1.5mm] text-[7.5pt] font-bold uppercase tracking-wide text-[#8a6a00]">
          <MessageSquare className="h-[3mm] w-[3mm]" /> Sticky note
        </div>
        <RichText {...commonRich} placeholder="Write a note…" />
      </div>
    );
  }

  const style: CSSProperties = {
    fontFamily: block.imported && block.fontFamily ? block.fontFamily : undefined,
    fontSize: block.imported && block.fontSize ? `${block.fontSize}pt` : undefined,
    color: block.color,
    background: block.whiteBackground ? "#fff" : undefined,
    lineHeight: block.imported ? 1.15 : block.lineHeight,
  };

  return (
    <div className={cn("doc-text-block", block.type === "heading" && "doc-heading")} style={style} onMouseDown={onSelect}>
      <RichText
        {...commonRich}
        className={cn(
          block.type === "heading" && block.level === 1 && "text-[20pt] font-bold",
          block.type === "heading" && block.level === 2 && "text-[15pt] font-bold",
          block.type === "heading" && block.level === 3 && "text-[12pt] font-bold",
          block.imported && "whitespace-pre-wrap"
        )}
        placeholder={block.type === "heading" ? "Heading" : "Type here…"}
      />
    </div>
  );
}
