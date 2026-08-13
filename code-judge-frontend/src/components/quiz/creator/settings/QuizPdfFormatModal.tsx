"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  FileCheck2,
  FileText,
  LayoutGrid,
  ListChecks,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";

export type PdfFormat = "full-width" | "two-column";
export type PdfContent = "with-answers" | "without-answers";

interface ContentOption {
  id: PdfContent;
  title: string;
  caption: string;
  icon: typeof ListChecks;
  points: string[];
}

const CONTENT_OPTIONS: ContentOption[] = [
  {
    id: "without-answers",
    title: "Without Answers",
    caption: "Question paper for students",
    icon: ListChecks,
    points: [
      "Questions",
      "Options",
      "No correct answers",
      "No explanations",
      "No hints",
    ],
  },
  {
    id: "with-answers",
    title: "With Answers",
    caption: "Answer sheet for teachers",
    icon: FileCheck2,
    points: [
      "Questions",
      "Options",
      "Correct answers",
      "Explanations",
      "Hints",
    ],
  },
];

interface FormatOption {
  id: PdfFormat;
  title: string;
  caption: string;
  icon: typeof FileText;
  points: string[];
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: "full-width",
    title: "Full Width",
    caption: "Single column, full page width",
    icon: FileText,
    points: ["Single column", "Full page width"],
  },
  {
    id: "two-column",
    title: "Two Column",
    caption: "Compact printable question paper",
    icon: LayoutGrid,
    points: ["Two simple columns", "Compact paper"],
  },
];

function SelectionCard({
  content,
  selected,
  onSelect,
  buttonRef,
}: {
  content: { id: string; title: string; caption: string; icon: typeof ListChecks; points: string[] };
  selected: boolean;
  onSelect: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const Icon = content.icon;
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${content.title}: ${content.caption}`}
      onClick={onSelect}
      className={cn(
        "group relative flex cursor-pointer flex-col rounded-xl border p-4 text-left outline-none transition-all duration-150",
        "focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
        selected
          ? "border-accent/60 bg-accent/[0.06]"
          : "border-border bg-card-hover/40 hover:border-border-hover hover:bg-card-hover/70"
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-sm">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150",
            selected
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-border bg-card text-text-muted group-hover:text-text-secondary"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={cn(
            "text-sm font-semibold transition-colors duration-150",
            selected ? "text-text-primary" : "text-text-primary"
          )}
        >
          {content.title}
        </span>
      </div>
      <p className="mt-2 text-xs text-text-secondary">{content.caption}</p>
      <ul className="mt-2.5 space-y-1">
        {content.points.map((point) => (
          <li key={point} className="flex items-center gap-1.5 text-[11px] leading-snug text-text-secondary">
            <Check className="h-3 w-3 shrink-0 text-accent/70" strokeWidth={2.5} />
            {point}
          </li>
        ))}
      </ul>
    </button>
  );
}

/**
 * Step 1 picks the content of the question paper (with / without answers),
 * step 2 picks the page layout. The PDF is only generated after both choices
 * are confirmed. Nothing here touches the PDF renderer — it only forwards
 * `content` and `format` to the caller.
 */
export default function QuizPdfFormatModal({
  open,
  onClose,
  onGenerate,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (content: PdfContent, format: PdfFormat) => void;
  generating?: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [content, setContent] = useState<PdfContent | null>(null);
  const [format, setFormat] = useState<PdfFormat | null>(null);
  const contentRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (step === 2) setStep(1);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  useEffect(() => {
    if (!open || step !== 1) return;
    const onArrows = (e: KeyboardEvent) => {
      if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
      e.preventDefault();
      const idx = CONTENT_OPTIONS.findIndex((o) => o.id === content);
      const next =
        e.key === "ArrowRight"
          ? (idx + 1) % CONTENT_OPTIONS.length
          : (idx - 1 + CONTENT_OPTIONS.length) % CONTENT_OPTIONS.length;
      const option = CONTENT_OPTIONS[next];
      setContent(option.id);
      contentRefs.current[next]?.focus();
    };
    window.addEventListener("keydown", onArrows);
    return () => window.removeEventListener("keydown", onArrows);
  }, [open, step, content]);

  if (!open) return null;

  const proceed = () => {
    if (step === 2 && content && format) {
      onGenerate(content, format);
      return;
    }
    if (step === 1 && content) setStep(2);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          onClick={step === 2 ? () => setStep(1) : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Choose question paper options"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-[540px] overflow-y-auto rounded-[18px] border border-border bg-card p-6 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card-hover/60 text-accent">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold leading-tight text-text-primary">
                    {step === 1 ? "What should the PDF contain?" : "Choose the layout"}
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 pl-12 text-xs text-text-secondary">
              {step === 1
                ? "Choose how you want your question paper generated."
                : "Now pick how the paper is laid out."}
            </p>

            {step === 1 ? (
              <>
                <div
                  role="radiogroup"
                  aria-label="PDF content"
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  {CONTENT_OPTIONS.map((option, i) => (
                    <SelectionCard
                      key={option.id}
                      content={option}
                      selected={content === option.id}
                      onSelect={() => setContent(option.id)}
                      buttonRef={(el) => {
                        contentRefs.current[i] = el;
                      }}
                    />
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={onClose}
                    className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={proceed}
                    disabled={!content}
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold transition-all duration-150",
                      content
                        ? "bg-accent text-white hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none active:scale-[0.98]"
                        : "cursor-not-allowed bg-text-muted/25 text-text-muted"
                    )}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  role="radiogroup"
                  aria-label="PDF layout"
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  {FORMAT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={format === option.id}
                      aria-label={`${option.title}: ${option.caption}`}
                      onClick={() => setFormat(option.id)}
                      className={cn(
                        "group relative flex cursor-pointer flex-col rounded-xl border p-4 text-left outline-none transition-all duration-150",
                        "focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                        format === option.id
                          ? "border-accent/60 bg-accent/[0.06]"
                          : "border-border bg-card-hover/40 hover:border-border-hover hover:bg-card-hover/70"
                      )}
                    >
                      {format === option.id && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-sm">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150",
                            format === option.id
                              ? "border-accent/30 bg-accent/10 text-accent"
                              : "border-border bg-card text-text-muted group-hover:text-text-secondary"
                          )}
                        >
                          <option.icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-text-primary">{option.title}</span>
                      </div>
                      <p className="mt-2 text-xs text-text-secondary">{option.caption}</p>
                      <ul className="mt-2.5 space-y-1">
                        {option.points.map((point) => (
                          <li key={point} className="flex items-center gap-1.5 text-[11px] leading-snug text-text-secondary">
                            <Check className="h-3 w-3 shrink-0 text-accent/70" strokeWidth={2.5} />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
                  >
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onClose}
                      className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={proceed}
                      disabled={!format || generating}
                      className={cn(
                        "inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold transition-all duration-150",
                        format && !generating
                          ? "bg-accent text-white hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none active:scale-[0.98]"
                          : "cursor-not-allowed bg-text-muted/25 text-text-muted"
                      )}
                    >
                      {generating ? "Generating…" : "Generate PDF"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}