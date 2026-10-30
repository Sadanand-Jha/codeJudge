"use client";

import { useEffect, useRef, useState } from "react";
import { CloudUpload, FileText, Image as ImageIcon, Loader2, ShieldCheck, X } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "@/lib/toast";
import { DEFAULT_HEADER_CONFIG } from "@/config/letterheads";
import {
  createLetterhead,
  notifyLetterheadsChanged,
  uploadLetterheadFile,
} from "@/services/letterheads";
import { normalizeHeaderConfig } from "@/utils/letterheadLayout";
import { validateLetterheadFile } from "@/utils/letterheadUpload";
import type {
  CloudinaryUploadAsset,
  HeaderConfig,
  Letterhead,
} from "@/types/letterhead";
import { AdjustHeaderDialog } from "./AdjustHeaderDialog";

interface UploadLetterheadDialogProps {
  onClose: () => void;
  onSaved: (letterhead: Letterhead) => void;
}

export function UploadLetterheadDialog({ onClose, onSaved }: UploadLetterheadDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [asset, setAsset] = useState<CloudinaryUploadAsset | null>(null);
  const [name, setName] = useState("");
  const [config, setConfig] = useState<HeaderConfig>({ ...DEFAULT_HEADER_CONFIG });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const chooseFile = (next: File | null) => {
    if (!next) return;
    const validation = validateLetterheadFile(next);
    if (!validation.ok) {
      toast.error({ title: "Could not use that file", description: validation.error });
      return;
    }
    setFile(next);
    const base = next.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    setName(base.slice(0, 60));
    setAsset(null);
    setProgress(0);
  };

  const startUpload = async () => {
    if (!file || uploading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadLetterheadFile(
        file,
        (percent) => setProgress(percent),
        controller.signal
      );
      setAsset(uploaded);
      setConfig(
        normalizeHeaderConfig(
          { ...DEFAULT_HEADER_CONFIG, repeatOnAllPages: uploaded.format === "pdf" },
          uploaded.width,
          uploaded.height
        )
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.info("Upload cancelled.");
      } else {
        toast.error({
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "Please try again in a moment.",
        });
      }
    } finally {
      abortRef.current = null;
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
  };

  const save = async () => {
    if (!asset || saving) return;
    if (!name.trim()) {
      toast.error("Give this header a name.");
      return;
    }
    setSaving(true);
    try {
      const letterhead = await createLetterhead({
        name: name.trim(),
        asset,
        headerConfig: normalizeHeaderConfig(config, asset.width, asset.height),
      });
      notifyLetterheadsChanged();
      toast.success({
        title: "Header saved",
        description: `"${letterhead.name}" is ready to use in your question papers.`,
      });
      onSaved(letterhead);
    } catch (error) {
      toast.error({
        title: "Could not save header",
        description: getApiErrorMessage(error, "Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  if (asset?.previewUrl) {
    return (
      <AdjustHeaderDialog
        title="Place your letterhead"
        description="This is exactly how it will appear above the first page of the question paper."
        imageUrl={asset.previewUrl}
        imageWidth={asset.width}
        imageHeight={asset.height}
        config={config}
        onChange={setConfig}
        name={name}
        onNameChange={setName}
        onClose={onClose}
        onSave={() => void save()}
        saving={saving}
        saveLabel="Save header"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-letterhead-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <CloudUpload className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="upload-letterhead-title" className="text-lg font-extrabold tracking-tight text-[var(--qs-ink)]">
                Upload a letterhead
              </h2>
              <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                PDF, PNG or JPG · up to 10 MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="b b-icon sm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!uploading) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!uploading) chooseFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`rounded-[16px] border-2 border-dashed px-4 py-8 text-center transition ${
              dragging
                ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10"
                : "border-[var(--qs-line)] bg-[var(--qs-bg)]"
            }`}
          >
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <CloudUpload className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-[var(--qs-ink)]">
              Drag and drop your letterhead here
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
              Only the top portion of a PDF page 1 is used.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="b mt-4 gap-1.5"
            >
              <ImageIcon className="h-4 w-4" />
              Choose file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
          </div>

          {file && (
            <div className="flex min-w-0 items-center gap-3 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--qs-bg)] text-[var(--qs-ink)]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-[var(--qs-ink)]">{file.name}</p>
                <p className="text-[10px] font-semibold text-[var(--qs-muted)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploading && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--qs-line)]">
                    <div
                      className="h-full rounded-full bg-[var(--qs-brand)] transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
              {uploading ? (
                <span className="text-[10px] font-extrabold text-[var(--qs-brand)]">{progress}%</span>
              ) : null}
            </div>
          )}

          <p className="flex items-start gap-2 text-[11px] font-semibold text-[var(--qs-muted)]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
            Files upload directly to secure storage. Your header is only visible to you.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          {uploading ? (
            <button type="button" onClick={cancelUpload} className="b sm">
              Cancel upload
            </button>
          ) : (
            <button type="button" onClick={onClose} className="b sm">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => void startUpload()}
            disabled={!file || uploading}
            className="b b-pri sm gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload & adjust"}
          </button>
        </div>
      </div>
    </div>
  );
}
