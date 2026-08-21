"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/helpers";
import { Image as ImageIcon } from "lucide-react";

export function RichToolbar({
  onCommand,
}: {
  onCommand?: () => void;
}) {
  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    onCommand?.();
  };

  const insertImage = () => {
    const val = window.prompt("Enter image URL");
    if (val) exec("insertImage", val);
  };

  return (
    <div className="flex items-center gap-0.5 rounded-t-xl border-b border-border bg-card-hover/40 p-1.5">
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          insertImage();
        }}
        title="Insert image"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all hover:border-border hover:bg-card-hover hover:text-text-primary"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
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

  // Sync DOM only when the external `value` changes from a source other than
  // the user typing (avoids the controlled contentEditable cursor-jump bug).
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (lastValueRef.current !== value) {
      el.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value]);

  // Stable ref callback — recreating it on every render makes React detach and
  // reattach the ref each keystroke, which reset innerHTML (and the caret).
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
        "w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none",
        "[&>[data-placeholder]:not(:empty)+br]:h-0",
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
