"use client";

import { useState } from "react";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import type { DocumentPage, ExamDocument } from "@/lib/documentEditor/types";
import { cn } from "@/lib/helpers";

function MiniPage({ page, index, total }: { page: DocumentPage; index: number; total: number }) {
  return (
    <span className="relative block aspect-[210/297] w-full overflow-hidden rounded-[2px] bg-white ring-1 ring-[#d8d2ef]">
      {page.background ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.background} alt="" className="absolute inset-0 h-full w-full object-fill opacity-90" />
      ) : (
        <span className="absolute inset-[8%] flex flex-col gap-[3px]">
          {page.blocks.slice(0, 12).map((block) => (
            <span
              key={block.id}
              className={cn(
                "block h-[2px] rounded-full",
                block.type === "heading" && "h-[4px] w-2/3 bg-[#1a1240]",
                block.type === "section" && "h-[3px] w-1/2 bg-[#6a3df0]",
                block.type === "question" && "w-[85%] bg-[#8b86a3]",
                block.type === "instructions" && "h-[12px] rounded-sm border border-[#d8d2ef] bg-[#fbfaff]",
                block.type === "text" && "bg-[#c8c2df]",
                block.type === "field" && "h-[3px] bg-[#b9b1dc]",
                block.type === "table" && "h-[8px] bg-[#e7e2f7]"
              )}
            />
          ))}
        </span>
      )}
      <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-[3px] text-[6px] font-bold tabular-nums text-[#5c5679]">
        {index + 1}/{total}
      </span>
    </span>
  );
}

export function PageThumbnails({
  document: doc,
  currentPageId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  document: ExamDocument;
  currentPageId: string;
  onSelect: (pageId: string) => void;
  onAdd: () => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  return (
    <aside className="flex h-full w-[150px] shrink-0 flex-col border-r-2 border-[var(--qs-line)] bg-[#f5f2ff]">
      <div className="flex items-center justify-between border-b border-[var(--qs-line)] px-3 py-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">Pages</span>
        <button type="button" onClick={onAdd} className="b b-icon sm" title="Add page" aria-label="Add page">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {doc.pages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={(event) => {
              setDragIndex(index);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "group relative rounded-[10px] border-2 bg-white p-1.5 transition",
              currentPageId === page.id
                ? "border-[var(--qs-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
                : "border-transparent hover:border-[var(--qs-line)]",
              dragIndex === index && "opacity-60"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(page.id)}
              className="block w-full text-left"
              aria-label={`Open page ${index + 1}`}
              aria-current={currentPageId === page.id ? "page" : undefined}
            >
              <MiniPage page={page} index={index} total={doc.pages.length} />
            </button>
            <span className="mt-1 flex items-center justify-between px-0.5">
              <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--qs-muted)]">
                <GripVertical className="h-3 w-3" />
                {index + 1}
              </span>
              <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onDuplicate(page.id)}
                  className="grid h-5 w-5 place-items-center rounded text-[var(--qs-muted)] hover:bg-[var(--qs-poly-1)] hover:text-[var(--qs-ink)]"
                  title="Duplicate page"
                  aria-label={`Duplicate page ${index + 1}`}
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(page.id)}
                  disabled={doc.pages.length === 1}
                  className="grid h-5 w-5 place-items-center rounded text-[var(--qs-muted)] hover:bg-[var(--qs-badbg)] hover:text-[var(--qs-bad)] disabled:opacity-30"
                  title="Delete page"
                  aria-label={`Delete page ${index + 1}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
