"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Download, Eye, FileText, Loader2, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { timeAgo } from "@/lib/formatters";
import { getApiErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import {
  ROOM_DOCUMENT_ACCEPT,
  ROOM_DOCUMENT_MAX_BYTES,
  deleteRoomDocument,
  downloadRoomDocument,
  fetchRoomDocumentPreview,
  formatDocumentSize,
  listRoomDocuments,
  roomDocumentExtension,
  uploadRoomDocument,
  type RoomDocument,
} from "@/services/roomDocuments";

const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-[9px] text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60";

function fileType(name: string): string {
  const extension = name.split(".").pop();
  return extension ? extension.toUpperCase() : "FILE";
}

type PreviewKind = "pdf" | "image" | "text" | "unsupported";

function documentPreviewKind(name: string): PreviewKind {
  const extension = roomDocumentExtension(name);
  if (extension === "pdf") return "pdf";
  if (extension === "png" || extension === "jpg" || extension === "jpeg") return "image";
  if (extension === "txt" || extension === "csv") return "text";
  return "unsupported";
}

function DocumentPreviewModal({
  roomId,
  doc,
  onClose,
  onDownload,
}: {
  roomId: string;
  doc: RoomDocument;
  onClose: () => void;
  onDownload: (document: RoomDocument) => void;
}) {
  const kind = documentPreviewKind(doc.name);
  const [loading, setLoading] = useState(kind !== "unsupported");
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (kind === "unsupported") return;

    let active = true;
    let objectUrl: string | null = null;

    fetchRoomDocumentPreview(roomId, doc.id)
      .then(async (blob) => {
        if (!active) return;
        if (kind === "text") {
          const content = await blob.text();
          if (!active) return;
          setText(content);
          setLoading(false);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(getApiErrorMessage(cause, "We couldn't preview this document."));
        setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, kind, roomId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const titleId = `room-document-preview-${doc.id}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0d0921]/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[0_24px_80px_rgba(13,9,33,0.35)] sm:rounded-[20px]"
      >
        <header className="flex items-start gap-3 border-b-2 border-[var(--qs-line)] px-4 py-3.5 sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="truncate text-[15px] font-extrabold text-[var(--qs-ink)] sm:text-base"
            >
              {doc.name}
            </h2>
            <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--qs-muted)]">
              {doc.type} · {formatDocumentSize(doc.bytes)} · {timeAgo(doc.addedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDownload(doc)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-[var(--qs-bg)]">
          {loading ? (
            <div className="grid min-h-[320px] place-items-center px-4 py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--qs-brand)]" />
              <p className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">Loading preview…</p>
            </div>
          ) : error ? (
            <div className="grid min-h-[320px] place-items-center px-4 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-[var(--qs-muted)]" />
              <p className="mt-2 text-sm font-extrabold text-[var(--qs-ink)]">
                Couldn&apos;t load the preview
              </p>
              <p className="mt-0.5 max-w-md text-xs text-[var(--qs-muted)]">{error}</p>
              <button
                type="button"
                onClick={() => onDownload(doc)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
              >
                <Download className="h-3.5 w-3.5" />
                Download instead
              </button>
            </div>
          ) : kind === "unsupported" ? (
            <div className="grid min-h-[320px] place-items-center px-4 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-[var(--qs-muted)]" />
              <p className="mt-2 text-sm font-extrabold text-[var(--qs-ink)]">
                Preview isn&apos;t available for this file type
              </p>
              <p className="mt-0.5 max-w-md text-xs text-[var(--qs-muted)]">
                Download the file to open it in Word, PowerPoint or Excel.
              </p>
              <button
                type="button"
                onClick={() => onDownload(doc)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-2 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
              >
                <Download className="h-3.5 w-3.5" />
                Download file
              </button>
            </div>
          ) : kind === "pdf" && url ? (
            <iframe
              src={url}
              title={doc.name}
              className="h-[68dvh] min-h-[360px] w-full bg-white"
            />
          ) : kind === "image" && url ? (
            <div className="grid min-h-[320px] place-items-center p-4">
              <img
                src={url}
                alt={doc.name}
                className="max-h-[64dvh] max-w-full rounded-[10px] object-contain"
              />
            </div>
          ) : kind === "text" ? (
            <pre className="min-h-[320px] whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed text-[var(--qs-ink)] sm:p-6 sm:text-[13px]">
              {text ?? ""}
            </pre>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DeleteDocumentModal({
  doc,
  roomName,
  deleting,
  onCancel,
  onConfirm,
}: {
  doc: RoomDocument;
  roomName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onCancel]);

  const titleId = `room-document-delete-${doc.id}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0d0921]/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md overflow-hidden rounded-t-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[0_24px_80px_rgba(13,9,33,0.35)] sm:rounded-[20px]"
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-bad)]/10 text-[var(--qs-bad)]">
              <Trash2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-extrabold text-[var(--qs-ink)]">
                Delete this document?
              </h2>
              <p className="mt-1 text-[13px] leading-[1.5] text-[var(--qs-muted)]">
                <span className="font-bold text-[var(--qs-ink)]">{doc.name}</span> will be
                permanently removed from {roomName}. Students will no longer be able to
                download it.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              aria-label="Close delete confirmation"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="inline-flex h-9 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-4 text-xs font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {deleting ? "Deleting…" : "Delete document"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

type BusyAction = { id: string; kind: "download" | "delete" } | null;

export default function RoomDocumentsPanel({
  roomId,
  roomName,
  readOnly = false,
}: {
  roomId: string;
  roomName: string;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<RoomDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("Uploading…");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<RoomDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomDocument | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setLoadError(null);
    });

    listRoomDocuments(roomId)
      .then((rows) => {
        if (!cancelled) setDocuments(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(error, "We couldn't load these documents."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, reloadKey]);

  const roomDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      ),
    [documents]
  );

  const fileTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const document of roomDocuments) {
      const type = document.type || fileType(document.name);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    return [
      { type: "ALL", count: roomDocuments.length },
      ...Array.from(counts, ([type, count]) => ({ type, count })),
    ];
  }, [roomDocuments]);

  const activeType = fileTypes.some((entry) => entry.type === typeFilter)
    ? typeFilter
    : "ALL";

  const visibleDocuments = useMemo(
    () =>
      activeType === "ALL"
        ? roomDocuments
        : roomDocuments.filter(
            (document) => (document.type || fileType(document.name)) === activeType
          ),
    [activeType, roomDocuments]
  );

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const valid = files.filter(
      (file) => file.size <= ROOM_DOCUMENT_MAX_BYTES && roomDocumentExtension(file.name)
    );
    const skipped = files.length - valid.length;

    if (skipped > 0) {
      toast.error({
        title: "Some files were skipped",
        description: "Use a supported file type no larger than 25 MB.",
      });
    }
    if (valid.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const added: RoomDocument[] = [];
    let failed = 0;

    for (let index = 0; index < valid.length; index += 1) {
      const file = valid[index];
      setUploadLabel(
        valid.length > 1
          ? `Uploading ${index + 1}/${valid.length} · ${file.name}`
          : `Uploading ${file.name}`
      );
      try {
        added.push(
          await uploadRoomDocument(roomId, file, (percent) => {
            setUploadProgress(
              Math.round(((index + percent / 100) / valid.length) * 100)
            );
          })
        );
      } catch {
        failed += 1;
      }
    }

    if (added.length > 0) {
      setDocuments((current) => [...added, ...current]);
      toast.success({
        title: added.length === 1 ? "Document added" : "Documents added",
        description: `${added.length} file${added.length === 1 ? "" : "s"} shared with ${roomName}.`,
      });
    }
    if (failed > 0) {
      toast.error({
        title: failed === 1 ? "One document failed" : `${failed} documents failed`,
        description: "Please try uploading them again.",
      });
    }

    setUploading(false);
    setUploadLabel("Uploading…");
    setUploadProgress(0);
  };

  const handleDownload = async (document: RoomDocument) => {
    if (busyAction) return;
    setBusyAction({ id: document.id, kind: "download" });
    try {
      await downloadRoomDocument(roomId, document.id, document.name);
    } catch (error: unknown) {
      toast.error({
        title: "Download failed",
        description: getApiErrorMessage(error, "Please try again."),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (document: RoomDocument): Promise<boolean> => {
    if (busyAction) return false;
    setBusyAction({ id: document.id, kind: "delete" });
    try {
      await deleteRoomDocument(roomId, document.id);
      setDocuments((current) => current.filter((entry) => entry.id !== document.id));
      toast.success({
        title: "Document removed",
        description: `${document.name} is no longer shared.`,
      });
      return true;
    } catch (error: unknown) {
      toast.error({
        title: "Couldn't remove the document",
        description: getApiErrorMessage(error, "Please try again."),
      });
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const deleted = await handleDelete(deleteTarget);
    if (deleted) setDeleteTarget(null);
  };

  const renderActions = (document: RoomDocument) => {
    const downloading =
      busyAction?.id === document.id && busyAction.kind === "download";
    const deleting = busyAction?.id === document.id && busyAction.kind === "delete";
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setPreviewDocument(document)}
          aria-label={`Preview ${document.name}`}
          className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-brand)]"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => void handleDownload(document)}
          disabled={Boolean(busyAction)}
          aria-label={`Download ${document.name}`}
          className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setDeleteTarget(document)}
            disabled={Boolean(busyAction)}
            aria-label={`Delete ${document.name}`}
            className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-surface)] hover:text-[var(--qs-bad)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    );
  };

  const renderMobileDocument = (document: RoomDocument) => (
    <div
      key={document.id}
      className="flex items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5"
    >
      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
        <FileText className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold text-[var(--qs-ink)]">
          {document.name}
        </span>
        <span className="mt-0.5 block text-[12px] font-semibold text-[var(--qs-muted)]">
          {document.type} · {formatDocumentSize(document.bytes)} · {timeAgo(document.addedAt)}
        </span>
      </span>
      {renderActions(document)}
    </div>
  );

  return (
    <section className="relative mb-4 mr-1 lg:flex lg:flex-col">
      <div aria-hidden className="absolute left-1 top-1 -bottom-1 -right-1 rounded-[18px] bg-[var(--qs-sun)]" />
      <div className="relative overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] lg:flex lg:flex-1 lg:flex-col">
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div>
            <h2 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)]">
              <FileText className="h-[22px] w-[22px] text-[var(--qs-brand)]" />
              Documents
            </h2>
            <p className="mt-0.5 text-[13px] leading-[1.4] text-[var(--qs-muted)]">
              {readOnly
                ? "Notes, sheets and files shared by your teacher."
                : "Notes, sheets and files shared with this room."}
            </p>
          </div>
          {readOnly && roomDocuments.length > 0 ? (
            <span className="hidden rounded-full bg-[var(--qs-poly-1)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)] sm:inline-flex">
              {roomDocuments.length} {roomDocuments.length === 1 ? "file" : "files"}
            </span>
          ) : null}
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className={PRIMARY_BTN}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="max-w-[210px] truncate">
                  {uploading ? uploadLabel : "Add document"}
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                accept={ROOM_DOCUMENT_ACCEPT}
                onChange={(event) => void handleFiles(event)}
              />
            </>
          )}
        </header>

        {uploading && (
          <div className="border-t-2 border-[var(--qs-line)] px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-[12px] font-extrabold text-[var(--qs-ink)]">
              <span className="flex min-w-0 items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--qs-brand)]" />
                <span className="truncate">{uploadLabel}</span>
              </span>
              <span className="shrink-0 tabular-nums">{uploadProgress}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadProgress}
              aria-label="Document upload progress"
              className="relative mt-2 h-2.5 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]"
            >
              <div
                className="relative h-full overflow-hidden rounded-full bg-[var(--qs-brand)] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(uploadProgress, 6)}%` }}
              >
                <span className="bar-shimmer absolute inset-y-0 left-0" />
              </div>
            </div>
          </div>
        )}

        <div className="border-t-2 border-[var(--qs-line)] p-3 lg:flex-1">
          {loading ? (
            <div className="grid place-items-center rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--qs-brand)]" />
              <p className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">
                Loading documents…
              </p>
            </div>
          ) : loadError ? (
            <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10 text-center">
              <FileText className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
              <p className="mt-2 text-sm font-bold text-[var(--qs-ink)]">
                Couldn&apos;t load documents
              </p>
              <p className="mt-0.5 text-xs text-[var(--qs-muted)]">{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          ) : roomDocuments.length === 0 ? (
            <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10 text-center">
              <FileText className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
              <p className="mt-2 text-sm font-bold text-[var(--qs-ink)]">No documents yet</p>
              <p className="mt-0.5 text-xs text-[var(--qs-muted)]">
                {readOnly
                  ? `Documents shared by your teacher for ${roomName} will appear here.`
                  : `Add notes or a practice sheet for ${roomName}.`}
              </p>
            </div>
          ) : readOnly ? (
            <>
              <div className="mb-3 hidden flex-wrap items-center gap-2 sm:flex">
                {fileTypes.map((entry) => {
                  const active = entry.type === activeType;
                  return (
                    <button
                      key={entry.type}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTypeFilter(entry.type)}
                      className={cn(
                        "inline-flex h-8 items-center rounded-full border-2 px-3 text-[12px] font-extrabold uppercase tracking-[0.06em] transition-colors",
                        active
                          ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                      )}
                    >
                      {entry.type === "ALL" ? "All" : entry.type}
                      <span className={cn("ml-1.5", active ? "opacity-70" : "text-[var(--qs-muted)]")}>
                        {entry.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <div className="grid grid-cols-[minmax(0,1fr)_90px_110px_140px_72px] gap-3 px-3.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Shared</span>
                  <span aria-hidden />
                </div>
                <div className="mt-2 space-y-2">
                  {visibleDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="grid grid-cols-[minmax(0,1fr)_90px_110px_140px_72px] items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-3 text-[13px] text-[var(--qs-muted)]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                          <FileText className="h-[18px] w-[18px]" />
                        </span>
                        <span className="truncate text-[15px] font-extrabold text-[var(--qs-ink)]">
                          {document.name}
                        </span>
                      </div>
                      <span>
                        <span className="rounded-full bg-[var(--qs-poly-1)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--qs-ink)]">
                          {document.type}
                        </span>
                      </span>
                      <span className="font-semibold">
                        {formatDocumentSize(document.bytes)}
                      </span>
                      <span className="font-semibold">{timeAgo(document.addedAt)}</span>
                      {renderActions(document)}
                    </div>
                  ))}
                  {visibleDocuments.length === 0 ? (
                    <div className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-4 py-8 text-center text-xs font-semibold text-[var(--qs-muted)]">
                      No documents match this filter.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2.5 md:hidden">
                {visibleDocuments.map(renderMobileDocument)}
              </div>
            </>
          ) : (
            <div className="space-y-2.5">
              {roomDocuments.map(renderMobileDocument)}
            </div>
          )}
        </div>
      </div>
      {previewDocument && (
        <DocumentPreviewModal
          key={previewDocument.id}
          roomId={roomId}
          doc={previewDocument}
          onClose={() => setPreviewDocument(null)}
          onDownload={(document) => void handleDownload(document)}
        />
      )}
      {deleteTarget && (
        <DeleteDocumentModal
          key={deleteTarget.id}
          doc={deleteTarget}
          roomName={roomName}
          deleting={
            busyAction?.id === deleteTarget.id && busyAction.kind === "delete"
          }
          onCancel={() => {
            if (busyAction?.id === deleteTarget.id && busyAction.kind === "delete") return;
            setDeleteTarget(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </section>
  );
}
