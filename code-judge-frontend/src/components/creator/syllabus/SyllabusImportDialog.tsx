"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  getSyllabusImportCost,
  getSyllabusImportJob,
  getSyllabusImportStreamUrl,
  startSyllabusImport,
  type SyllabusImportCost,
  type SyllabusImportJob,
} from "@/services/syllabus";

interface SyllabusImportDialogProps {
  onClose: () => void;
  onReady: (job: SyllabusImportJob) => void;
}

const ACCEPT = ".pdf,.docx,.txt";
const FALLBACK_MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileExtension(name: string): string {
  return `.${name.split(".").pop()?.toLowerCase() ?? ""}`;
}

const STATUS_LABEL: Record<SyllabusImportJob["status"], string> = {
  queued: "Queued",
  processing: "Reading document",
  ready: "Ready to review",
  failed: "Import failed",
};

export function SyllabusImportDialog({ onClose, onReady }: SyllabusImportDialogProps) {
  const [cost, setCost] = useState<SyllabusImportCost | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<SyllabusImportJob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [badFile, setBadFile] = useState(false);
  const [streamText, setStreamText] = useState("");
  const handledReady = useRef(false);
  const onReadyRef = useRef(onReady);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<HTMLPreElement | null>(null);
  const displayStreamText = streamText || job?.streamText || "";

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [displayStreamText]);

  useEffect(() => {
    let cancelled = false;
    getSyllabusImportCost()
      .then((value) => {
        if (!cancelled) setCost(value);
      })
      .catch(() => {
        if (!cancelled) setCost(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const jobId = job?.id;
  const jobStatus = job?.status;
  const busy = jobStatus === "queued" || jobStatus === "processing";

  useEffect(() => {
    if (!jobId || (jobStatus !== "queued" && jobStatus !== "processing")) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getSyllabusImportJob(jobId);
        if (cancelled) return;
        setJob(next);
        if (next.status === "ready" && !handledReady.current) {
          handledReady.current = true;
          onReadyRef.current(next);
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(getApiErrorMessage(pollError, "Could not check the import progress."));
        }
      }
    };
    const timer = setInterval(poll, 1500);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, jobStatus]);

  useEffect(() => {
    if (!jobId || (jobStatus !== "queued" && jobStatus !== "processing")) return;
    const source = new EventSource(getSyllabusImportStreamUrl(jobId), {
      withCredentials: true,
    });
    const read = (event: MessageEvent): { text?: string } | null => {
      try {
        return JSON.parse(String(event.data)) as { text?: string };
      } catch {
        return null;
      }
    };
    source.addEventListener("snapshot", (event) => {
      const payload = read(event as MessageEvent);
      if (typeof payload?.text === "string") setStreamText(payload.text);
    });
    source.addEventListener("delta", (event) => {
      const payload = read(event as MessageEvent);
      if (typeof payload?.text !== "string" || !payload.text) return;
      setStreamText((previous) => `${previous}${payload.text}`.slice(-20_000));
    });
    source.addEventListener("done", () => {
      source.close();
    });
    return () => source.close();
  }, [jobId, jobStatus]);

  const maxBytes = cost?.maxBytes ?? FALLBACK_MAX_BYTES;
  const allowedExtensions = cost?.allowedExtensions ?? [".pdf", ".docx", ".txt"];
  const creditCost = cost?.creditCost ?? 10;

  const chooseFile = (next: File | null) => {
    setError(null);
    setBadFile(false);
    if (!next) {
      setFile(null);
      return;
    }
    if (!allowedExtensions.includes(fileExtension(next.name))) {
      setBadFile(true);
      setError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    if (next.size <= 0) {
      setBadFile(true);
      setError("This file is empty.");
      return;
    }
    if (next.size > maxBytes) {
      setBadFile(true);
      setError(`This file is over ${Math.round(maxBytes / (1024 * 1024))} MB. Please upload a smaller one.`);
      return;
    }
    setFile(next);
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setBadFile(false);
    try {
      const created = await startSyllabusImport(file);
      handledReady.current = false;
      setStreamText("");
      setJob(created);
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, "Could not start the syllabus import."));
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setJob(null);
    setFile(null);
    setError(null);
    setBadFile(false);
    setDragOver(false);
    setStreamText("");
    handledReady.current = false;
    if (inputRef.current) inputRef.current.value = "";
  };

  const stateText = busy
    ? "Reading your document…"
    : job?.status === "ready"
      ? `Balanced syllabus generated · ${job.creditsUsed} credits used`
      : job?.status === "failed"
        ? "Import failed — credits refunded"
        : file
          ? `Ready · uses ${creditCost} AI credits`
          : "";
  const stateOk = !busy && (file || job?.status === "ready");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(20,16,46,0.62)] p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="syllabus-import-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[600px] flex-col overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[8px_8px_0_var(--qs-sun)]"
      >
        <header className="relative shrink-0 overflow-hidden bg-[var(--qs-brand)] px-5 py-5 text-[var(--qs-on-brand)] sm:px-7">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-24 h-56 w-56 rounded-full bg-white/10"
          />
          <span className="relative inline-flex items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
            Custom syllabus
          </span>
          <h2
            id="syllabus-import-title"
            className="relative mt-2.5 text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]"
          >
            Import a syllabus
          </h2>
          <p className="relative mt-2 max-w-[440px] text-[13px] font-semibold leading-5 text-white/85">
            Upload a document and let AI generate a balanced syllabus. Multi-subject files
            become separate syllabus cards.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-transform hover:-translate-y-0.5 sm:right-6 sm:top-5"
            aria-label="Close import dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-4">
            <div className="flex gap-3 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5">
              <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--qs-ok)]" />
              <div className="min-w-0">
                <b className="block text-[14px] font-extrabold text-[var(--qs-ink)]">
                  {creditCost} AI credits per import
                </b>
                <p className="mt-0.5 text-[12.5px] font-medium leading-5 text-[var(--qs-muted)]">
                  PDF, DOCX, or TXT up to {Math.round(maxBytes / (1024 * 1024))} MB. Each detected
                  subject is saved as its own card. Credits are refunded automatically if the
                  import fails.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "flex min-h-[210px] flex-col items-center justify-center gap-1.5 rounded-[22px] border-2 border-dashed bg-[var(--qs-surface)] px-5 py-7 text-center transition-all",
                badFile
                  ? "border-[var(--qs-bad)]"
                  : dragOver
                    ? "border-solid border-[var(--qs-ink)] bg-[var(--qs-poly-1)] shadow-[5px_5px_0_var(--qs-sun)]"
                    : "border-[var(--qs-brand)]"
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!busy) setDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                if (busy) return;
                chooseFile(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                disabled={busy || uploading}
                onChange={(event) => {
                  chooseFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
                className="sr-only"
                id="syllabus-import-file"
              />

              {file ? (
                <div className="flex w-full max-w-[420px] items-center gap-3.5 rounded-2xl border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] p-3.5 text-left shadow-[4px_4px_0_var(--qs-ink)] max-sm:flex-wrap">
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
                    <FileText className="h-[22px] w-[22px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <b
                      className="block truncate text-[15px] font-extrabold text-[var(--qs-ink)]"
                      title={file.name}
                    >
                      {file.name}
                    </b>
                    <span className="mt-0.5 block text-[12.5px] font-semibold text-[var(--qs-muted)]">
                      {file.name.split(".").pop()?.toUpperCase()} · {formatBytes(file.size)}
                    </span>
                  </div>
                  {!busy && !uploading && (
                    <button
                      type="button"
                      onClick={() => chooseFile(null)}
                      className="h-[34px] shrink-0 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-[12px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-bad)] hover:text-[var(--qs-bad)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <span className="mb-2 grid h-[52px] w-[52px] place-items-center rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
                    <FileText className="h-[22px] w-[22px]" />
                  </span>
                  <b className="text-[16px] font-extrabold text-[var(--qs-ink)]">
                    Drop your syllabus here
                  </b>
                  <span className="text-[13.5px] font-medium text-[var(--qs-muted)]">
                    or choose a PDF, DOCX, or TXT file
                  </span>
                  <button
                    type="button"
                    disabled={busy || uploading}
                    onClick={() => inputRef.current?.click()}
                    className="mt-2.5 inline-flex h-10 items-center justify-center gap-1.5 rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 text-[13px] font-extrabold text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" /> Choose file
                  </button>
                </>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3.5 py-2.5 text-[12.5px] font-bold text-[var(--qs-bad)]"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {job && (
              <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[12.5px] font-extrabold text-[var(--qs-ink)]">
                    {job.status === "ready" ? (
                      <Check className="h-4 w-4 text-[var(--qs-ok)]" />
                    ) : job.status === "failed" ? (
                      <AlertTriangle className="h-4 w-4 text-[var(--qs-bad)]" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--qs-brand)]" />
                    )}
                    {STATUS_LABEL[job.status]}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-[var(--qs-muted)]">
                    {job.progress}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--qs-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--qs-brand)] transition-all duration-500"
                    style={{ width: `${Math.max(3, job.progress)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium leading-5 text-[var(--qs-muted)]">
                  {job.status === "failed"
                    ? job.errorMessage || "The document could not be analysed."
                    : "You can keep this window open while the document is broken into chapters and topics."}
                </p>
                {displayStreamText &&
                  job.status !== "ready" &&
                  job.status !== "failed" && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                      <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-400">
                          Live AI output
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">
                          streaming
                        </span>
                      </div>
                      <pre
                        ref={streamRef}
                        className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words p-2.5 font-mono text-[10px] leading-4 text-emerald-300"
                      >
                        {displayStreamText}
                      </pre>
                    </div>
                  )}
                {job.status === "failed" && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--qs-brand)] hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" /> Try another file
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 py-4 sm:px-7">
          <span
            className={cn(
              "inline-flex items-center gap-2 text-[12.5px] font-bold",
              stateOk ? "text-[var(--qs-ok)]" : "text-[var(--qs-muted)]"
            )}
            aria-live="polite"
          >
            {stateOk && !busy && <Check className="h-4 w-4 shrink-0" />}
            {stateText}
          </span>
          <div className="flex w-full gap-3 sm:ml-auto sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 text-[13px] font-extrabold text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-transform hover:-translate-y-0.5 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={upload}
              disabled={!file || uploading || busy || job?.status === "ready"}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-[13px] font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-transparent disabled:opacity-50 disabled:shadow-none sm:flex-none"
            >
              {uploading || busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : job?.status === "ready" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading
                ? "Uploading…"
                : busy
                  ? "Breaking down…"
                  : job?.status === "ready"
                    ? "Syllabus ready"
                    : "Break down with AI"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default SyllabusImportDialog;
