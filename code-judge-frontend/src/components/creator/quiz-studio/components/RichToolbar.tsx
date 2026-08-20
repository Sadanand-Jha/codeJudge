"use client";

import { useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Subscript,
  Superscript,
  List,
  ListOrdered,
  Link,
  Code,
  Image as ImageIcon,
  Table,
  Sigma,
} from "lucide-react";
import { cn } from "@/lib/helpers";

const COMMANDS: Array<{
  cmd: string;
  arg?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt?: boolean;
}> = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "subscript", icon: Subscript, label: "Subscript" },
  { cmd: "superscript", icon: Superscript, label: "Superscript" },
  { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  { cmd: "unlink", icon: Link, label: "Remove link", prompt: false },
  { cmd: "formatBlock", arg: "code", icon: Code, label: "Inline code" },
];

export function RichToolbar({
  onCommand,
}: {
  onCommand?: () => void;
}) {
  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    onCommand?.();
  };

  const promptAndExec = (cmd: string) => {
    const val = window.prompt(cmd === "createLink" ? "Enter link URL" : "Enter image URL");
    if (val) exec(cmd, val);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-border bg-white/[0.03] p-1.5">
      {COMMANDS.map((c) => (
        <button
          key={c.cmd}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec(c.cmd, c.arg);
          }}
          title={c.label}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all hover:border-border hover:bg-white/[0.06] hover:text-text-primary"
        >
          <c.icon className="h-4 w-4" />
        </button>
      ))}
      <div className="mx-1.5 h-4 w-px bg-border" />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          promptAndExec("createLink");
        }}
        title="Insert link"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all hover:border-border hover:bg-white/[0.06] hover:text-text-primary"
      >
        <Link className="h-4 w-4" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          promptAndExec("insertImage");
        }}
        title="Insert image"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all hover:border-border hover:bg-white/[0.06] hover:text-text-primary"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          const rows = window.prompt("Rows x Columns", "3x3");
          const [r, c] = (rows || "3x3").split("x").map(Number);
          let html = '<table style="width:100%;border-collapse:collapse;">';
          for (let i = 0; i < (r || 3); i++) {
            html += "<tr>";
            for (let j = 0; j < (c || 3); j++) {
              html += '<td style="border:1px solid #d1d5db;padding:4px;">&nbsp;</td>';
            }
            html += "</tr>";
          }
          html += "</table>";
          exec("insertHTML", html);
        }}
        title="Insert table"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all hover:border-border hover:bg-white/[0.06] hover:text-text-primary"
      >
        <Table className="h-4 w-4" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("insertHTML", '<span class="math-inline">\\( \\)</span>');
        }}
        title="Insert math"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all hover:border-border hover:bg-white/[0.06] hover:text-text-primary"
      >
        <Sigma className="h-4 w-4" />
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
  const lastValueRef = useRef(value);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    el.contentEditable = "true";
    el.spellcheck = false;
    el.dataset.placeholder = placeholder || "";
    el.innerHTML = value;
    lastValueRef.current = value;
  };

  return (
    <div
      ref={setRef}
      className={cn(
        "w-full resize-none border-0 bg-transparent px-0 text-sm text-text-primary placeholder-text-muted outline-none",
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
