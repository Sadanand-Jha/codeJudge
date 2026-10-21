"use client";

import { useRef, useEffect, useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/helpers";
import { Undo2, Redo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FORMAT_COMMANDS = ["bold", "italic", "underline", "strikeThrough", "subscript", "superscript"] as const;

function PianoKey({
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
        "qs-display flex h-16 w-9 shrink-0 select-none items-end justify-center rounded-t-[5px] rounded-b-[12px] border-2 border-[var(--qs-ink)] pb-2.5 text-[14px] font-extrabold leading-none transition-[transform,box-shadow,background-color,color,border-color] duration-150",
        "sm:h-[70px] sm:w-[42px] sm:rounded-t-[6px] sm:rounded-b-[13px] sm:pb-3 sm:text-[16px]",
        "lg:h-[76px] lg:w-[46px] lg:text-[17px]",
        active
          ? "translate-x-1 translate-y-1 bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-none"
          : "bg-[var(--qs-surface)] text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-sun)] hover:border-[var(--qs-brand)] active:translate-x-1 active:translate-y-1 active:shadow-none sm:shadow-[4px_4px_0_var(--qs-sun)]"
      )}
    >
      {children}
    </button>
  );
}

function BlackKey({
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
      className="flex h-[46px] w-8 shrink-0 items-end justify-center rounded-t-[4px] rounded-b-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] pb-2 text-[var(--qs-bg)] shadow-[3px_3px_0_var(--qs-sun)] transition-[transform,box-shadow,background-color,color] duration-150 hover:bg-[var(--qs-brand)] hover:text-[var(--qs-on-brand)] active:translate-x-[3px] active:translate-y-[3px] active:bg-[var(--qs-brand)] active:text-[var(--qs-on-brand)] active:shadow-none sm:h-[50px] sm:w-9 sm:rounded-b-[12px] sm:pb-2.5"
    >
      <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.4} />
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
      className="flex w-full max-w-full min-w-0 flex-wrap items-start gap-2.5 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5 sm:gap-5 sm:p-3"
    >
      <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
        <PianoKey title="Bold" active={activeCommands.has("bold")} onClick={() => exec("bold")}>
          B
        </PianoKey>
        <PianoKey title="Italic" active={activeCommands.has("italic")} onClick={() => exec("italic")}>
          <span className="italic">I</span>
        </PianoKey>
        <PianoKey title="Underline" active={activeCommands.has("underline")} onClick={() => exec("underline")}>
          <span className="underline decoration-2 underline-offset-4">U</span>
        </PianoKey>
        <PianoKey title="Strikethrough" active={activeCommands.has("strikeThrough")} onClick={() => exec("strikeThrough")}>
          <span className="line-through decoration-2">S</span>
        </PianoKey>
        <PianoKey title="Inline code" active={activeCommands.has("code")} onClick={toggleCode}>
          <span className="text-[12px] sm:text-[14px]">&lt;/&gt;</span>
        </PianoKey>
        <PianoKey title="Subscript" active={activeCommands.has("subscript")} onClick={() => exec("subscript")}>
          X<sub className="ml-px text-[9px] sm:text-[10px]">2</sub>
        </PianoKey>
        <PianoKey title="Superscript" active={activeCommands.has("superscript")} onClick={() => exec("superscript")}>
          X<sup className="ml-px text-[9px] sm:text-[10px]">2</sup>
        </PianoKey>
      </div>
      <div className="flex gap-1.5 sm:gap-2.5">
        <BlackKey icon={Undo2} title="Undo" onClick={() => exec("undo")} />
        <BlackKey icon={Redo2} title="Redo" onClick={() => exec("redo")} />
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
