"use client";

import { useCallback, useState, useRef } from "react";
import {
  Upload,
  FileText,
  FileCheck,
  AlertCircle,
  Sparkles,
  Info,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/helpers";
import { FileCard } from "./FileCard";
import type { UploadedFile } from "./types";

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
    <div className="mx-auto max-w-2xl space-y-8 pb-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Generate Quiz with AI
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Upload your problem list — we&apos;ll build the quiz configuration for you.
        </p>
        <Link
          href="/creator/quizzes/create"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-violet-500/30 hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Create Quiz
        </Link>
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
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200",
          dragging
            ? "border-violet-500 bg-violet-500/[0.06]"
            : file?.valid
            ? "border-emerald-500/30 bg-emerald-500/[0.03]"
            : file && !file.valid
            ? "border-rose-500/30 bg-rose-500/[0.03]"
            : "border-border hover:border-violet-500/30 hover:bg-violet-500/[0.03]"
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

      {/* Info section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-text-primary">
            What AI will generate
          </h3>
        </div>
        <p className="mb-3 text-xs text-text-secondary">
          The AI analyzes your problem list and suggests:
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {WHAT_AI_GENERATES.map((item) => (
            <div
              key={item}
              className="flex items-center gap-1.5 rounded-md bg-white/[0.03] px-2 py-1.5 text-[11px] font-medium text-text-secondary"
            >
              <FileCheck className="h-3 w-3 shrink-0 text-violet-500" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Hard limit notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Maximum 5 pages
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            Documents exceeding 5 pages will not be processed. The uploaded document must
            contain at most 5 pages.
          </p>
        </div>
      </div>
    </div>
  );
}
