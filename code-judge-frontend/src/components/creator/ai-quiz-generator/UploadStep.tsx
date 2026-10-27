"use client";

import { useCallback, useState, useRef } from "react";
import {
  Upload,
  FileText,
  FileCheck,
  Sparkles,
  ChevronDown,
  ArrowLeft,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/helpers";
import { FileCard } from "./FileCard";
import type { UploadedFile } from "./types";
import { AiStreamText } from "@/components/ui";
import { useFileUploadAccess } from "@/hooks/useFileUploadAccess";
import { useToast } from "@/hooks/useToast";

const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];
const MAX_PAGES = 5;

function simulatePageCount(file: File): number {
  const sizeKB = file.size / 1024;
  if (file.name.endsWith(".pdf")) return Math.max(1, Math.min(8, Math.ceil(sizeKB / 200)));
  return Math.max(1, Math.min(6, Math.ceil(sizeKB / 250)));
}

function validateFile(file: File): UploadedFile {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  const mimeValid = file.type in ACCEPTED_TYPES;
  const extValid = ACCEPTED_EXTENSIONS.includes(ext);

  if (!mimeValid && !extValid) {
    return {
      name: file.name,
      type: "pdf",
      size: file.size,
      pageCount: 0,
      valid: false,
      error: "This file type isn't supported. Upload a PDF or DOCX problem list.",
    };
  }

  const pageCount = simulatePageCount(file);
  const type = ext === ".docx" ? "docx" : "pdf";

  if (pageCount > MAX_PAGES) {
    return {
      name: file.name,
      type,
      size: file.size,
      pageCount,
      valid: false,
      error: `Your document contains ${pageCount} pages. Please upload a shorter problem list (maximum 5 pages).`,
    };
  }

  return { name: file.name, type, size: file.size, pageCount, valid: true };
}

const WHAT_AI_GENERATES = [
  "Quiz name",
  "Description",
  "Instructions",
  "Subject / category",
  "Topics",
  "Difficulty",
  "Question count",
  "Tags",
  "Suggested audience",
  "Assessment type",
];

export function UploadStep({
  onFileAccepted,
}: {
  onFileAccepted: (file: UploadedFile) => void;
}) {
  const toast = useToast();
  const { canUploadFiles, isLoading: subscriptionLoading, upgradeHref, upgradeMessage } =
    useFileUploadAccess();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (raw: File) => {
      if (!canUploadFiles) {
        if (!subscriptionLoading) {
          toast.error({ title: "Upgrade required", description: upgradeMessage });
        }
        return;
      }
      const validated = validateFile(raw);
      setFile(validated);
      if (validated.valid) onFileAccepted(validated);
    },
    [onFileAccepted, canUploadFiles, subscriptionLoading, upgradeMessage, toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onBrowse = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const removeFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-4 pb-8 sm:space-y-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/creator/quizzes/create"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Create Quiz
        </Link>
        <span className="rounded-full border-2 border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 px-2.5 py-1 text-[11px] font-extrabold text-[var(--qs-brand)]">
          AI assisted
        </span>
      </div>

      <div className="text-center px-2">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-sun)] shadow-[4px_4px_0_var(--qs-sun)] sm:h-14 sm:w-14">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-3xl">
          <AiStreamText text="Generate Quiz with AI" />
        </h1>
        <p className="mx-auto mt-2 min-h-5 max-w-md text-sm leading-5 text-[var(--qs-muted)]">
          <AiStreamText text="Upload your problem list — we'll build the quiz configuration for you." />
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!canUploadFiles) {
            if (!subscriptionLoading) {
              toast.error({ title: "Upgrade required", description: upgradeMessage });
            }
            return;
          }
          inputRef.current?.click();
        }}
        className={cn(
          "relative min-h-[190px] rounded-[24px] border-2 border-dashed bg-[var(--qs-surface)] p-6 text-center transition-all duration-200 sm:min-h-[220px] sm:p-10",
          canUploadFiles ? "cursor-pointer" : "cursor-not-allowed",
          dragging
            ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/[0.06]"
            : file?.valid
              ? "border-[var(--qs-ok)]/60 bg-[var(--qs-ok)]/[0.05]"
              : file && !file.valid
                ? "border-[var(--qs-bad)]/60 bg-[var(--qs-bad)]/[0.04]"
                : "border-[var(--qs-line)] hover:border-[var(--qs-brand)] hover:bg-[var(--qs-brand)]/[0.03]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={onBrowse}
          className="hidden"
          disabled={!canUploadFiles || subscriptionLoading}
        />

        {!subscriptionLoading && !canUploadFiles ? (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
              <Lock className="h-6 w-6" />
            </div>
            <p className="text-[15px] font-extrabold text-[var(--qs-ink)]">
              File uploads are paid-only
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
              <Link href={upgradeHref} className="font-extrabold text-[var(--qs-brand)] underline">
                Upgrade your plan
              </Link>{" "}
              to generate a quiz from your problem list.
            </p>
          </>
        ) : !file ? (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-[15px] font-extrabold text-[var(--qs-ink)]">
              Upload Problem List
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
              PDF or DOCX · Maximum 5 pages
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 py-2 text-xs font-extrabold text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-sun)] transition hover:bg-[var(--qs-brand)] hover:text-[var(--qs-on-brand)]"
            >
              <FileText className="h-3.5 w-3.5" />
              Browse Files
            </button>
          </>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <FileCard file={file} onRemove={removeFile} />
          </div>
        )}
      </div>

      <details className="group overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-extrabold text-[var(--qs-ink)] marker:content-none sm:px-5">
          <span>What will be generated?</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t-2 border-[var(--qs-line)] px-4 py-4 sm:px-5">
          <p className="mb-3 text-xs leading-5 text-[var(--qs-muted)]">
            You can review and edit every suggestion before the quiz is created.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WHAT_AI_GENERATES.map((item) => (
              <div key={item} className="flex min-w-0 items-center gap-2 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-2 text-[11px] font-bold text-[var(--qs-ink)]">
                <FileCheck className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
                <span className="min-w-0 break-words">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
