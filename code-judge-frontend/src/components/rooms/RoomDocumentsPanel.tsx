"use client";

import { useMemo, useRef, type ChangeEvent } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { useRoomContentStore } from "@/store/roomContentStore";
import { timeAgo } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";

const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-[9px] text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none";

function fileType(name: string): string {
  const extension = name.split(".").pop();
  return extension ? extension.toUpperCase() : "FILE";
}

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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
  const documents = useRoomContentStore((s) => s.documents);
  const addDocument = useRoomContentStore((s) => s.addDocument);
  const deleteDocument = useRoomContentStore((s) => s.deleteDocument);

  const roomDocuments = useMemo(
    () =>
      [...documents]
        .filter((document) => document.roomId === roomId)
        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()),
    [documents, roomId]
  );

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    files.forEach((file) => {
      addDocument(roomId, {
        name: file.name,
        type: fileType(file.name),
        size: fileSize(file.size),
      });
    });
    toast.success({
      title: files.length === 1 ? "Document added" : "Documents added",
      description: `${files.length} file${files.length === 1 ? "" : "s"} shared with ${roomName}.`,
    });
    event.target.value = "";
  };

  return (
    <section className="relative mb-4 mr-4">
      <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
      <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-[26px]">
          <div>
            <h2 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
              <FileText className="h-5 w-5 text-[var(--qs-brand)]" />
              Documents
            </h2>
            <p className="mt-0.5 text-sm text-[var(--qs-muted)]">
              {readOnly
                ? "Notes, sheets and files shared by your teacher."
                : "Notes, sheets and files shared with this room."}
            </p>
          </div>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={PRIMARY_BTN}
              >
                <Upload className="h-4 w-4" />
                Add document
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                onChange={handleFiles}
              />
            </>
          )}
        </header>

        <div className="border-t-2 border-[var(--qs-line)] p-4 sm:p-5">
          {roomDocuments.length === 0 ? (
            <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10 text-center">
              <FileText className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
              <p className="mt-2 text-sm font-bold text-[var(--qs-ink)]">No documents yet</p>
              <p className="mt-0.5 text-xs text-[var(--qs-muted)]">
                {readOnly
                  ? `Documents shared by your teacher for ${roomName} will appear here.`
                  : `Add notes or a practice sheet for ${roomName}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {roomDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-[var(--qs-ink)]">
                      {document.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-[var(--qs-muted)]">
                      {document.type} · {document.size} · {timeAgo(document.addedAt)}
                    </span>
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteDocument(document.id);
                        toast.success({
                          title: "Document removed",
                          description: `${document.name} is no longer shared.`,
                        });
                      }}
                      aria-label={`Delete ${document.name}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-surface)] hover:text-[var(--qs-bad)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
