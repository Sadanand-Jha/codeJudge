"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  Copy,
  FileDown,
  FileText,
  History,
  MessageSquare,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type {
  DocumentComment,
  DocumentVersion,
  ExamDocument,
  FindOptions,
  ShareSettings,
} from "@/lib/documentEditor/types";
import { plainTextFromHtml } from "@/lib/documentEditor/model";
import { buildFindRegex, countInHtml } from "@/lib/documentEditor/findReplace";
import { cn } from "@/lib/helpers";

const PANEL = "flex h-full w-[330px] shrink-0 flex-col border-l-2 border-[var(--qs-line)] bg-white";

function PanelHeader({ title, subtitle, onClose, icon: Icon }: { title: string; subtitle?: string; onClose: () => void; icon: React.ElementType }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[#f7f5ff] px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10px] leading-snug text-[var(--qs-muted)]">{subtitle}</p>}
        </div>
      </div>
      <button type="button" onClick={onClose} className="b b-icon sm" aria-label={`Close ${title}`}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-[12px] border-2 border-dashed border-[var(--qs-line)] text-[var(--qs-muted)]">
        <Sparkles className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-extrabold text-[var(--qs-ink)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--qs-muted)]">{body}</p>
    </div>
  );
}

export function FindReplacePanel({
  document: doc,
  onClose,
  onReplace,
  onReplaceAll,
  onJump,
}: {
  document: ExamDocument;
  onClose: () => void;
  onReplace: (pageId: string, blockId: string, options: FindOptions) => number;
  onReplaceAll: (options: FindOptions) => number;
  onJump: (pageId: string, blockId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [resultIndex, setResultIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const options: FindOptions = { query, replacement, regex, caseSensitive, wholeWord };
  const regexValid = useMemo(() => buildFindRegex(options) !== null, [options.query, options.regex, options.caseSensitive, options.wholeWord]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    if (!query || !regexValid) return [] as Array<{ pageId: string; blockId: string; index: number; text: string; count: number }>;
    const found: Array<{ pageId: string; blockId: string; index: number; text: string; count: number }> = [];
    doc.pages.forEach((page, pageIndex) => {
      page.blocks.forEach((block) => {
        const text = plainTextFromHtml(block.html);
        const count = countInHtml(block.html, options);
        if (count > 0) {
          found.push({
            pageId: page.id,
            blockId: block.id,
            index: pageIndex,
            text: text.length > 150 ? `${text.slice(0, 150)}…` : text,
            count,
          });
        }
      });
    });
    return found;
  }, [doc, query, regexValid, regex, caseSensitive, wholeWord]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = results.reduce((sum, item) => sum + item.count, 0);


  return (
    <section className={PANEL} aria-label="Find and replace">
      <PanelHeader title="Find & replace" subtitle="Regex, case and whole-word matching." icon={Search} onClose={onClose} />
      <div className="space-y-3 border-b border-[var(--qs-line)] p-4">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">Find</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the paper…"
            className="h-9 w-full rounded-[8px] border-2 border-[var(--qs-line)] bg-white px-3 text-sm outline-none focus:border-[var(--qs-brand)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">Replace with</span>
          <input
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            placeholder="Replacement text"
            className="h-9 w-full rounded-[8px] border-2 border-[var(--qs-line)] bg-white px-3 text-sm outline-none focus:border-[var(--qs-brand)]"
          />
        </label>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--qs-muted)]">
          {[
            { label: "Regex", value: regex, set: setRegex },
            { label: "Match case", value: caseSensitive, set: setCaseSensitive },
            { label: "Whole word", value: wholeWord, set: setWholeWord },
          ].map((item) => (
            <label key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--qs-line)] px-2 py-1">
              <input
                type="checkbox"
                checked={item.value}
                onChange={(event) => item.set(event.target.checked)}
                className="h-3 w-3 accent-[var(--qs-brand)]"
              />
              {item.label}
            </label>
          ))}
        </div>
        {regex && !regexValid && <p className="text-[11px] font-semibold text-[var(--qs-bad)]">Invalid regular expression.</p>}
        {message && <p className="text-[11px] font-semibold text-[var(--qs-ok)]">{message}</p>}
        <div className="flex items-center gap-2">
          <span className="mr-auto text-[11px] font-bold text-[var(--qs-muted)]">
            {query ? `${total} match${total === 1 ? "" : "es"}` : "Type to search"}
          </span>
          <button
            type="button"
            disabled={!results.length}
            onClick={() => {
              const target = results[resultIndex % results.length];
              if (!target) return;
              onJump(target.pageId, target.blockId);
              setResultIndex((index) => index + 1);
            }}
            className="b sm"
          >
            Find next
          </button>
          <button
            type="button"
            disabled={!results.length}
            onClick={() => {
              const target = results[0];
              if (!target) return;
              const count = onReplace(target.pageId, target.blockId, options);
              setMessage(`Replaced ${count} match${count === 1 ? "" : "es"}.`);
            }}
            className="b sm"
          >
            Replace
          </button>
        </div>
        <button
          type="button"
          disabled={!results.length}
          onClick={() => {
            const count = onReplaceAll(options);
            setMessage(`Replaced ${count} match${count === 1 ? "" : "es"} across the paper.`);
          }}
          className="b b-pri w-full"
        >
          Replace all
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-[var(--qs-muted)]">No matches yet.</p>
        ) : (
          results.map((result, index) => (
            <button
              key={`${result.blockId}_${index}`}
              type="button"
              onClick={() => onJump(result.pageId, result.blockId)}
              className={cn(
                "mb-1 block w-full rounded-[9px] border px-3 py-2 text-left transition hover:border-[var(--qs-brand)] hover:bg-[#faf9ff]",
                index === resultIndex % results.length ? "border-[var(--qs-brand)] bg-[#f6f2ff]" : "border-transparent"
              )}
            >
              <span className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">
                Page {result.index + 1}
                <span className="rounded-full bg-[var(--qs-poly-1)] px-1.5 py-0.5 text-[9px]">{result.count}</span>
              </span>
              <span className="mt-1 block line-clamp-2 text-[11px] leading-snug text-[var(--qs-ink)]">{result.text}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

export function CommentsPanel({
  document: doc,
  selectedBlockId,
  onClose,
  onAdd,
  onToggle,
  onRemove,
  onJump,
}: {
  document: ExamDocument;
  selectedBlockId: string | null;
  onClose: () => void;
  onAdd: (pageId: string, blockId: string, text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onJump: (pageId: string, blockId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const selectedPage = doc.pages.find((page) => page.blocks.some((block) => block.id === selectedBlockId));
  const sorted = [...doc.comments].sort((a, b) => Number(a.resolved) - Number(b.resolved));

  return (
    <section className={PANEL} aria-label="Comments">
      <PanelHeader title="Comments" subtitle="Threaded feedback stays separate from the paper." icon={MessageSquare} onClose={onClose} />
      <div className="border-b border-[var(--qs-line)] p-4">
        {selectedBlockId && selectedPage ? (
          <>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">On selected block</p>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Write a comment…"
              className="w-full resize-none rounded-[8px] border-2 border-[var(--qs-line)] bg-white p-2 text-xs outline-none focus:border-[var(--qs-brand)]"
            />
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                onAdd(selectedPage.id, selectedBlockId, draft);
                setDraft("");
              }}
              className="b b-pri mt-2 w-full sm"
            >
              Add comment
            </button>
          </>
        ) : (
          <p className="rounded-[8px] border border-dashed border-[var(--qs-line)] px-3 py-4 text-center text-[11px] text-[var(--qs-muted)]">
            Select a text block, question or object to leave a comment.
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sorted.length === 0 ? (
          <EmptyPanel title="No comments yet" body="Comments appear here and never print in the exported paper." />
        ) : (
          sorted.map((comment) => <CommentCard key={comment.id} comment={comment} doc={doc} onToggle={onToggle} onRemove={onRemove} onJump={onJump} />)
        )}
      </div>
    </section>
  );
}

function CommentCard({
  comment,
  doc,
  onToggle,
  onRemove,
  onJump,
}: {
  comment: DocumentComment;
  doc: ExamDocument;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onJump: (pageId: string, blockId: string) => void;
}) {
  const pageIndex = doc.pages.findIndex((page) => page.id === comment.pageId);
  return (
    <article className={cn("mb-2 rounded-[10px] border-2 p-3", comment.resolved ? "border-[var(--qs-line)] bg-[#faf9ff] opacity-70" : "border-[var(--qs-ink)] bg-white shadow-[3px_3px_0_var(--qs-sun)]")}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[var(--qs-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--qs-poly-2)] text-[9px] font-black text-[var(--qs-ink)]">
            {comment.author.slice(0, 1).toUpperCase()}
          </span>
          {comment.author}
        </span>
        <span>Page {pageIndex + 1}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--qs-ink)]">{comment.text}</p>
      <div className="mt-2 flex items-center gap-1 border-t border-[var(--qs-line)] pt-2">
        <button type="button" onClick={() => onJump(comment.pageId, comment.blockId)} className="rounded px-1.5 py-1 text-[9px] font-bold text-[var(--qs-muted)] hover:bg-[var(--qs-poly-1)]">
          Jump to block
        </button>
        <span className="flex-1" />
        <button type="button" onClick={() => onToggle(comment.id)} className="rounded px-1.5 py-1 text-[9px] font-bold text-[var(--qs-ok)] hover:bg-[var(--qs-okbg)]">
          {comment.resolved ? "Reopen" : "Resolve"}
        </button>
        <button type="button" onClick={() => onRemove(comment.id)} className="rounded px-1.5 py-1 text-[9px] font-bold text-[var(--qs-bad)] hover:bg-[var(--qs-badbg)]" aria-label="Delete comment">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}

export function ChangesPanel({
  document: doc,
  onClose,
  onResolve,
  onJump,
}: {
  document: ExamDocument;
  onClose: () => void;
  onResolve: (id: string, status: "accepted" | "rejected") => void;
  onJump: (pageId: string, blockId: string) => void;
}) {
  const pending = doc.changes.filter((change) => change.status === "pending");
  const settled = doc.changes.filter((change) => change.status !== "pending");
  return (
    <section className={PANEL} aria-label="Track changes">
      <PanelHeader title="Track changes" subtitle="Accept or reject edits recorded while tracking is on." icon={History} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {pending.length === 0 && settled.length === 0 ? (
          <EmptyPanel title="No tracked changes" body="Turn on Track changes in the Review ribbon, then edit a block." />
        ) : (
          <>
            {pending.map((change) => (
              <article key={change.id} className="mb-2 rounded-[10px] border-2 border-[var(--qs-ink)] bg-white p-3 shadow-[3px_3px_0_var(--qs-sun)]">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">
                  <span>Pending edit</span>
                  <span>{doc.pages.findIndex((page) => page.id === change.pageId) + 1}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[var(--qs-muted)] line-through">{plainTextFromHtml(change.before) || "(empty)"}</p>
                <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-[var(--qs-ink)]">{plainTextFromHtml(change.after) || "(empty)"}</p>
                <div className="mt-2 flex gap-1 border-t border-[var(--qs-line)] pt-2">
                  <button type="button" onClick={() => onResolve(change.id, "accepted")} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-bold text-[var(--qs-ok)] hover:bg-[var(--qs-okbg)]">
                    <Check className="h-3 w-3" /> Accept
                  </button>
                  <button type="button" onClick={() => onResolve(change.id, "rejected")} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-bold text-[var(--qs-bad)] hover:bg-[var(--qs-badbg)]">
                    <XCircle className="h-3 w-3" /> Reject
                  </button>
                  <button type="button" onClick={() => onJump(change.pageId, change.blockId)} className="ml-auto rounded px-1.5 py-1 text-[9px] font-bold text-[var(--qs-muted)] hover:bg-[var(--qs-poly-1)]">
                    View
                  </button>
                </div>
              </article>
            ))}
            {settled.length > 0 && (
              <p className="mb-1 mt-4 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--qs-muted)]">Resolved ({settled.length})</p>
            )}
            {settled.map((change) => (
              <div key={change.id} className="mb-1 flex items-center gap-2 rounded-[7px] border border-[var(--qs-line)] px-2.5 py-2 text-[10px]">
                <span className={cn("h-1.5 w-1.5 rounded-full", change.status === "accepted" ? "bg-[var(--qs-ok)]" : "bg-[var(--qs-bad)]")} />
                <span className="flex-1 text-[var(--qs-muted)]">{change.status === "accepted" ? "Accepted" : "Rejected"} edit</span>
                <button type="button" onClick={() => onJump(change.pageId, change.blockId)} className="text-[9px] font-bold text-[var(--qs-brand)]">
                  View
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function formatRelative(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function VersionsPanel({
  versions,
  onClose,
  onSave,
  onRestore,
  onDelete,
}: {
  versions: DocumentVersion[];
  onClose: () => void;
  onSave: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className={PANEL} aria-label="Version history">
      <PanelHeader title="Version history" subtitle="Local snapshots — restore any point in the session." icon={History} onClose={onClose} />
      <div className="border-b border-[var(--qs-line)] p-3">
        <button type="button" onClick={onSave} className="b b-pri w-full">
          Save a version
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {versions.length === 0 ? (
          <EmptyPanel title="No saved versions" body="Press Ctrl+S or save a version before a large edit." />
        ) : (
          versions.map((version, index) => (
            <article key={version.id} className={cn("mb-2 rounded-[10px] border-2 p-3", index === 0 ? "border-[var(--qs-ink)] bg-white shadow-[3px_3px_0_var(--qs-sun)]" : "border-[var(--qs-line)] bg-white")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-[var(--qs-ink)]">{version.label}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--qs-muted)]">
                    <Clock3 className="h-2.5 w-2.5" /> {formatRelative(version.createdAt)} · {version.document.pages.length} pages
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => onRestore(version.id)} className="rounded p-1 text-[var(--qs-brand)] hover:bg-[var(--qs-poly-1)]" title="Restore version" aria-label={`Restore ${version.label}`}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => onDelete(version.id)} className="rounded p-1 text-[var(--qs-bad)] hover:bg-[var(--qs-badbg)]" title="Delete version" aria-label={`Delete ${version.label}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function ChromePanel({
  document: doc,
  onClose,
  onUpdate,
}: {
  document: ExamDocument;
  onClose: () => void;
  onUpdate: (patch: Partial<ExamDocument["chrome"]>) => void;
}) {
  return (
    <section className={PANEL} aria-label="Header and footer">
      <PanelHeader title="Header & footer" subtitle="Page chrome repeats on every generated page." icon={FileText} onClose={onClose} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2 rounded-[10px] border border-[var(--qs-line)] p-3">
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--qs-ink)]">
            <input type="checkbox" checked={doc.chrome.showHeader} onChange={(event) => onUpdate({ showHeader: event.target.checked })} className="accent-[var(--qs-brand)]" />
            Show page header
          </label>
          <textarea
            value={doc.chrome.headerHtml}
            onChange={(event) => onUpdate({ headerHtml: event.target.value })}
            rows={3}
            className="w-full rounded-[7px] border border-[var(--qs-line)] p-2 font-mono text-[10px] outline-none focus:border-[var(--qs-brand)]"
            aria-label="Header rich text"
          />
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--qs-ink)]">
            <input type="checkbox" checked={doc.chrome.showOnFirstPage} onChange={(event) => onUpdate({ showOnFirstPage: event.target.checked })} className="accent-[var(--qs-brand)]" />
            Show on first page
          </label>
        </div>
        <div className="space-y-2 rounded-[10px] border border-[var(--qs-line)] p-3">
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--qs-ink)]">
            <input type="checkbox" checked={doc.chrome.showFooter} onChange={(event) => onUpdate({ showFooter: event.target.checked })} className="accent-[var(--qs-brand)]" />
            Show page footer
          </label>
          <textarea
            value={doc.chrome.footerLeftHtml}
            onChange={(event) => onUpdate({ footerLeftHtml: event.target.value })}
            rows={2}
            className="w-full rounded-[7px] border border-[var(--qs-line)] p-2 font-mono text-[10px] outline-none focus:border-[var(--qs-brand)]"
            aria-label="Footer left rich text"
          />
          <label className="flex items-center gap-2 text-[11px] font-bold text-[var(--qs-ink)]">
            <input type="checkbox" checked={doc.chrome.showPageNumbers} onChange={(event) => onUpdate({ showPageNumbers: event.target.checked })} className="accent-[var(--qs-brand)]" />
            Page X of Y
          </label>
        </div>
        <div className="rounded-[10px] border border-[#c9e8dc] bg-[#effbf6] p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#13795b]">
            <ShieldCheck className="h-3.5 w-3.5" /> Footer safe zone
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-[#2b5f4f]">
            The QuizSupport logo and name are a separate protected layer. They always sit inside this reserved area and cannot be edited, covered or deleted.
          </p>
        </div>
      </div>
    </section>
  );
}

const SHARE_ROLES: Array<{ id: ShareSettings["linkRole"]; label: string; detail: string }> = [
  { id: "viewer", label: "View only", detail: "Read the paper and export a copy." },
  { id: "commenter", label: "Comment only", detail: "Read and leave comments." },
  { id: "editor", label: "Can edit", detail: "Edit pages, questions and layout." },
];

export function ShareDialog({
  open,
  document: doc,
  onClose,
  onUpdate,
  onCopy,
}: {
  open: boolean;
  document: ExamDocument;
  onClose: () => void;
  onUpdate: (patch: Partial<ShareSettings>) => void;
  onCopy: (role: ShareSettings["linkRole"]) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[rgba(26,18,64,0.45)] p-4" role="dialog" aria-modal="true" aria-label="Share paper" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-white shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[#f7f5ff] px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-[var(--qs-ink)]">Share “{doc.title}”</h2>
            <p className="mt-0.5 text-[11px] text-[var(--qs-muted)]">Choose what people with the link can do.</p>
          </div>
          <button type="button" onClick={onClose} className="b b-icon sm" aria-label="Close share dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 p-5">
          {SHARE_ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onUpdate({ linkRole: role.id })}
              className={cn(
                "flex w-full items-start gap-3 rounded-[10px] border-2 p-3 text-left transition",
                doc.share.linkRole === role.id ? "border-[var(--qs-brand)] bg-[#f6f2ff]" : "border-[var(--qs-line)] hover:border-[var(--qs-ink)]"
              )}
            >
              <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", doc.share.linkRole === role.id ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-white" : "border-[var(--qs-line)]")}>
                {doc.share.linkRole === role.id && <Check className="h-3 w-3" />}
              </span>
              <span>
                <span className="block text-xs font-extrabold text-[var(--qs-ink)]">{role.label}</span>
                <span className="mt-0.5 block text-[10px] text-[var(--qs-muted)]">{role.detail}</span>
              </span>
            </button>
          ))}
          <label className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[var(--qs-muted)]">
            <input type="checkbox" checked={doc.share.allowComments} onChange={(event) => onUpdate({ allowComments: event.target.checked })} className="accent-[var(--qs-brand)]" />
            Allow comments on this link
          </label>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--qs-muted)]">
            <input type="checkbox" checked={doc.share.allowDownload} onChange={(event) => onUpdate({ allowDownload: event.target.checked })} className="accent-[var(--qs-brand)]" />
            Allow PDF / DOCX downloads
          </label>
        </div>
        <div className="flex items-center gap-2 border-t-2 border-[var(--qs-line)] bg-[#f7f5ff] px-5 py-4">
          <div className="min-w-0 flex-1 truncate rounded-[8px] border border-[var(--qs-line)] bg-white px-3 py-2 text-[10px] font-semibold text-[var(--qs-muted)]">
            {typeof window !== "undefined" ? `${window.location.origin}/creator/tests/editor?role=${doc.share.linkRole}&doc=${doc.id}` : ""}
          </div>
          <button type="button" onClick={() => onCopy(doc.share.linkRole)} className="b b-pri sm gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

export type ExportFormat = "pdf" | "docx" | "png" | "print";

export function ExportDialog({
  open,
  busy,
  error,
  onClose,
  onExport,
}: {
  open: boolean;
  busy: ExportFormat | null;
  error: string | null;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}) {
  if (!open) return null;
  const options: Array<{ id: ExportFormat; title: string; detail: string; icon: React.ElementType }> = [
    { id: "pdf", title: "PDF document", detail: "High-fidelity A4, embedded fonts, page numbers.", icon: FileText },
    { id: "docx", title: "Word document", detail: "Editable .docx with a protected footer.", icon: FileDown },
    { id: "png", title: "PNG pages", detail: "One image per page, downloaded separately.", icon: FileDown },
    { id: "print", title: "Print", detail: "Open the trusted print view with branding.", icon: Printer },
  ];
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[rgba(26,18,64,0.45)] p-4" role="dialog" aria-modal="true" aria-label="Export paper" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="w-full max-w-xl overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-white shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[#f7f5ff] px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-[var(--qs-ink)]">Export paper</h2>
            <p className="mt-0.5 text-[11px] text-[var(--qs-muted)]">The server rebuilds the QuizSupport footer for every export.</p>
          </div>
          <button type="button" onClick={onClose} disabled={Boolean(busy)} className="b b-icon sm" aria-label="Close export dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => onExport(option.id)}
              className="flex items-start gap-3 rounded-[10px] border-2 border-[var(--qs-line)] p-3 text-left transition hover:border-[var(--qs-ink)] hover:bg-[#faf9ff] disabled:opacity-60"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                {busy === option.id ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1a1240] border-t-transparent" /> : <option.icon className="h-4 w-4" />}
              </span>
              <span>
                <span className="block text-xs font-extrabold text-[var(--qs-ink)]">{option.title}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-[var(--qs-muted)]">{option.detail}</span>
              </span>
            </button>
          ))}
        </div>
        {error && <p className="mx-4 mb-3 rounded-[8px] border border-[#f0b7bb] bg-[#fff1f2] px-3 py-2 text-[11px] font-semibold text-[#b4232e]">{error}</p>}
        <div className="flex items-center gap-2 border-t-2 border-[var(--qs-line)] bg-[#effbf6] px-5 py-3 text-[10px] font-semibold text-[#2b5f4f]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#13795b]" />
          Branding is verified server-side: locked, visible, full opacity and uncovered. Export is rejected if the check fails.
        </div>
      </div>
    </div>
  );
}

export function UnsavedBadge({ status }: { status: "idle" | "dirty" | "saving" | "saved" | "error" }) {
  const map = {
    idle: { label: "Draft", className: "border-[var(--qs-line)] bg-white text-[var(--qs-muted)]" },
    dirty: { label: "Unsaved changes", className: "border-[#ffd23f] bg-[#fff8cc] text-[#6b5200]" },
    saving: { label: "Saving…", className: "border-[#ffd23f] bg-[#fff8cc] text-[#6b5200]" },
    saved: { label: "Saved", className: "border-[#c9e8dc] bg-[#effbf6] text-[#13795b]" },
    error: { label: "Storage full", className: "border-[#f0b7bb] bg-[#fff1f2] text-[#b4232e]" },
  } as const;
  const item = map[status];
  return <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em]", item.className)}>{item.label}</span>;
}

export function ShortcutLegend({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ["Ctrl + B / I / U", "Bold, italic, underline"],
    ["Ctrl + Z / Y", "Undo / redo"],
    ["Ctrl + F", "Find and replace"],
    ["Ctrl + S", "Save version"],
    ["Ctrl + P", "Print via trusted server view"],
    ["Delete / Backspace", "Delete selected object (never branding)"],
    ["Esc", "Close panel or deselect"],
  ];
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-[rgba(26,18,64,0.45)] p-4" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-md overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-white shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--qs-line)] bg-[#f7f5ff] px-5 py-3">
          <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="b b-icon sm" aria-label="Close shortcuts">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-4">
          {shortcuts.map(([keys, label]) => (
            <div key={keys} className="flex items-center justify-between gap-3 border-b border-[var(--qs-line)] py-2 last:border-0">
              <span className="text-[11px] text-[var(--qs-muted)]">{label}</span>
              <kbd className="shrink-0 rounded border border-[var(--qs-line)] bg-[#faf9ff] px-1.5 py-0.5 text-[9px] font-bold text-[var(--qs-ink)]">{keys}</kbd>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t-2 border-[var(--qs-line)] bg-[#effbf6] px-5 py-3 text-[10px] font-semibold text-[#2b5f4f]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#13795b]" /> Protected branding ignores every delete, clear and select-all command.
        </div>
      </div>
    </div>
  );
}

export function SelectionChevron() {
  return <ChevronRight className="h-3 w-3" />;
}
