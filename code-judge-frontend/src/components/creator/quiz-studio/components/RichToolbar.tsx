"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/helpers";
import { Bold, Italic, Underline, Strikethrough, Code2, Link2, Image as ImageIcon, Sigma, Table, Undo2, Redo2 } from "lucide-react";

export function RichToolbar({ onCommand }: { onCommand?: () => void }) {
  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    onCommand?.();
  };
  const insertImage = () => {
    const val = window.prompt("Enter image URL");
    if (val) exec("insertImage", val);
  };
  const Btn = ({ icon: Icon, title, onClick }: { icon: any; title: string; onClick?: () => void }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      title={title}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-card-hover hover:text-text-primary sm:h-7 sm:w-7"
    >
      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
    </button>
  );
  return (
    <div className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-0.5 overflow-hidden border-b border-border bg-card px-1 sm:px-2 py-1 sm:py-1.5">
      <Btn icon={Bold} title="Bold" onClick={() => exec("bold")} />
      <Btn icon={Italic} title="Italic" onClick={() => exec("italic")} />
      <Btn icon={Underline} title="Underline" onClick={() => exec("underline")} />
      <Btn icon={Strikethrough} title="Strikethrough" onClick={() => exec("strikeThrough")} />
      <span className="mx-1 h-4 w-px bg-border" />
      <Btn icon={Code2} title="Code" onClick={() => exec("insertHTML", "<code>" + window.getSelection()?.toString() + "</code>")} />
      <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("subscript"); }} title="Subscript" className="px-1 py-0.5 text-xs text-text-secondary hover:bg-card-hover hover:text-text-primary rounded shrink-0">x₂</button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("superscript"); }} title="Superscript" className="px-1 py-0.5 text-xs text-text-secondary hover:bg-card-hover hover:text-text-primary rounded shrink-0">x²</button>
      <span className="mx-0.5 sm:mx-1 h-4 w-px shrink-0 bg-border" />
      <Btn icon={Link2} title="Link" onClick={() => { const url = window.prompt("Enter URL"); if (url) exec("createLink", url); }} />
      <Btn icon={ImageIcon} title="Image" onClick={insertImage} />
      <Btn icon={Sigma} title="Math" onClick={() => exec("insertHTML", "<span class='math'>Σ</span>")} />
      <Btn icon={Table} title="Table" onClick={() => exec("insertHTML", "<table class='border-collapse border border-zinc-300'><tr><td class='border border-zinc-300 px-3 py-1'></td><td class='border border-zinc-300 px-3 py-1'></td></tr><tr><td class='border border-zinc-300 px-3 py-1'></td><td class='border border-zinc-300 px-3 py-1'></td></tr></table>")} />
      <span className="mx-0.5 sm:mx-1 h-4 w-px shrink-0 bg-border" />
      <Btn icon={Undo2} title="Undo" onClick={() => exec("undo")} />
      <Btn icon={Redo2} title="Redo" onClick={() => exec("redo")} />
    </div>
  );
}

export function EditableContent({
  value,
  onChange,
  placeholder,
  minHeight = "min-h-[90px]",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (lastValueRef.current !== value) {
      el.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value]);

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      elRef.current = el;
      if (!el) return;
      el.contentEditable = "true";
      el.spellcheck = false;
      el.dataset.placeholder = placeholder || "";
    },
    [placeholder]
  );

  return (
    <div
      ref={setRef}
      className={cn(
        "w-full max-w-full min-w-0 resize-none border-0 bg-transparent px-3 py-3 text-[14px] sm:text-[15px] leading-relaxed text-text-primary placeholder:text-text-muted outline-none break-words overflow-x-hidden",
        minHeight
      )}
      data-placeholder={placeholder}
      onInput={(e) => {
        const v = (e.currentTarget as HTMLDivElement).innerHTML;
        lastValueRef.current = v;
        onChange(v);
      }}
    />
  );
}
