"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/helpers";

export function RichText({
  html,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Type here…",
  className,
  editable = true,
  ariaLabel,
}: {
  html: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  onBlur?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(html);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (element.innerHTML === html) {
      lastEmitted.current = html;
      return;
    }
    if (html === lastEmitted.current) return;
    element.innerHTML = html;
    lastEmitted.current = html;
  }, [html]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.innerHTML = html;
    lastEmitted.current = html;
    // Only hydrate on mount; edits are intentionally uncontrolled after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      className={cn(
        "doc-rich min-w-0 outline-none",
        editable && "cursor-text",
        !editable && "cursor-default",
        className
      )}
      onInput={(event) => {
        const next = event.currentTarget.innerHTML;
        lastEmitted.current = next;
        onChange(next);
      }}
      onFocus={() => onFocus?.()}
      onBlur={(event) => onBlur?.(event.currentTarget.innerHTML)}
      onPaste={(event) => {
        if (!editable) return;
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      onDragStart={(event) => event.preventDefault()}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
