"use client";

import { useCallback, useState, useRef } from "react";
import {
  Upload,
  FileText,
  FileCheck,
  Sparkles,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/helpers";
import { FileCard } from "./FileCard";
import type { UploadedFile } from "./types";
import { AiStreamText } from "@/components/ui";

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
  "Duration",
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
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (raw: File) => {
      const validated = validateFile(raw);
      setFile(validated);
      if (validated.valid) onFileAccepted(validated);
    },
    [onFileAccepted]
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
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Create Quiz
        </Link>
        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
          AI assisted
        </span>
      </div>

      {/* Header */}
      <div className="text-center px-2">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20 sm:h-12 sm:w-12">
          <Sparkles className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
          <AiStreamText text="Generate Quiz with AI" />
        </h1>
        <p className="mx-auto mt-1.5 min-h-5 max-w-md text-sm leading-5 text-text-secondary sm:mt-2">
          <AiStreamText text="Upload your problem list — we'll build the quiz configuration for you." />
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative min-h-[190px] cursor-pointer rounded-2xl border-2 border-dashed bg-card p-6 text-center transition-all duration-200 sm:min-h-[220px] sm:p-10",
          (!file || file.valid) && "ai-upload-zone",
          dragging
            ? "border-violet-500 bg-violet-500/[0.06]"
            : file?.valid
            ? "border-emerald-500/30 bg-emerald-500/[0.03]"
            : file && !file.valid
            ? "border-rose-500/30 bg-rose-500/[0.03]"
            : "border-border hover:border-violet-500/40 hover:bg-violet-500/[0.03]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={onBrowse}
          className="hidden"
        />

        {!file ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-card text-text-muted">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">
              Upload Problem List
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              PDF or DOCX · Maximum 5 pages
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-violet-500/30 hover:text-text-primary"
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

      <details className="ai-color-card group overflow-hidden rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-text-primary marker:content-none sm:px-5">
          <span>What will be generated?</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <p className="mb-3 text-xs leading-5 text-text-secondary">
            You can review and edit every suggestion before the quiz is created.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WHAT_AI_GENERATES.map((item) => (
              <div key={item} className="flex min-w-0 items-center gap-2 rounded-lg bg-card-hover/60 px-2.5 py-2 text-[11px] font-medium text-text-secondary">
                <FileCheck className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="min-w-0 break-words">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
