"use client";

import { useRef, useEffect, useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/helpers";
import { Undo2, Redo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FORMAT_COMMANDS = ["bold", "italic", "underline", "strikeThrough", "subscript", "superscript"] as const;

function ToolbarButton({
  children,
  title,
  active,
  onClick,
}: {
  children: ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-10 w-10 shrink-0 select-none place-items-center rounded-[10px] border-0 bg-transparent text-[16px] font-extrabold leading-none text-[var(--qs-ink)] transition-colors duration-150",
        "hover:bg-[var(--qs-bg)] active:bg-[var(--qs-line)]",
        active && "bg-[var(--qs-ink)] text-[var(--qs-bg)] shadow-[inset_0_-3px_0_var(--qs-sun)] hover:bg-[var(--qs-ink)]"
      )}
    >
      {children}
    </button>
  );
}

function HistoryButton({
  icon: Icon,
  title,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border-0 bg-transparent text-[var(--qs-ink)] transition-colors duration-150 hover:bg-[var(--qs-bg)] active:bg-[var(--qs-line)]"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
    </button>
  );
}

export function RichToolbar({ onCommand }: { onCommand?: () => void }) {
  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set());

  const syncActiveCommands = useCallback(() => {
    const next = new Set<string>();
    for (const command of FORMAT_COMMANDS) {
      try {
        if (document.queryCommandState(command)) next.add(command);
      } catch {
        // Ignore browsers that do not expose command state.
      }
    }

    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const anchorElement = anchor instanceof Element ? anchor : anchor?.parentElement;
    const editor = anchorElement?.closest("[contenteditable='true']");
    if (editor && anchorElement?.closest("code")) next.add("code");

    setActiveCommands(next);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", syncActiveCommands);
    return () => document.removeEventListener("selectionchange", syncActiveCommands);
  }, [syncActiveCommands]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    syncActiveCommands();
    onCommand?.();
  };

  const toggleCode = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const anchor = selection.anchorNode;
    const anchorElement = anchor instanceof Element ? anchor : anchor?.parentElement;
    const editor = anchorElement?.closest("[contenteditable='true']");
    if (!editor) return;

    const code = anchorElement?.closest("code");
    if (code && editor.contains(code)) {
      const parent = code.parentNode;
      if (!parent) return;
      while (code.firstChild) parent.insertBefore(code.firstChild, code);
      parent.removeChild(code);
    } else if (!selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const element = document.createElement("code");
      element.appendChild(range.extractContents());
      range.insertNode(element);
      selection.removeAllRanges();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(element);
      selection.addRange(nextRange);
    }

    syncActiveCommands();
    onCommand?.();
  };

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-field)] p-1.5"
    >
      <div className="flex gap-1 border-r-2 border-[var(--qs-line)] pr-2">
        <ToolbarButton title="Bold" active={activeCommands.has("bold")} onClick={() => exec("bold")}>
          B
        </ToolbarButton>
        <ToolbarButton title="Italic" active={activeCommands.has("italic")} onClick={() => exec("italic")}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton title="Underline" active={activeCommands.has("underline")} onClick={() => exec("underline")}>
          <span className="underline decoration-2 underline-offset-4">U</span>
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={activeCommands.has("strikeThrough")} onClick={() => exec("strikeThrough")}>
          <span className="line-through decoration-2">S</span>
        </ToolbarButton>
      </div>
      <div className="flex gap-1 border-r-2 border-[var(--qs-line)] pr-2">
        <ToolbarButton title="Inline code" active={activeCommands.has("code")} onClick={toggleCode}>
          <span className="text-[15px]">&lt;/&gt;</span>
        </ToolbarButton>
        <ToolbarButton title="Subscript" active={activeCommands.has("subscript")} onClick={() => exec("subscript")}>
          <span className="inline-block text-[18px] leading-none">x<sub className="text-[11px] leading-none">2</sub></span>
        </ToolbarButton>
        <ToolbarButton title="Superscript" active={activeCommands.has("superscript")} onClick={() => exec("superscript")}>
          <span className="inline-block text-[18px] leading-none">x<sup className="text-[11px] leading-none">2</sup></span>
        </ToolbarButton>
      </div>
      <div className="flex gap-1">
        <HistoryButton icon={Undo2} title="Undo" onClick={() => exec("undo")} />
        <HistoryButton icon={Redo2} title="Redo" onClick={() => exec("redo")} />
      </div>
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
        "w-full max-w-full min-w-0 resize-none border-0 bg-transparent px-3 py-3 text-[14px] sm:text-[15px] leading-relaxed text-[var(--qs-ink)] outline-none break-words overflow-x-hidden",
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
