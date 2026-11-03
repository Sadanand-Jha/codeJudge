"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/helpers";

export type SearchableSelectOption = {
  id: number;
  name: string;
  count?: number;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  allowClear = true,
  labelClassName,
  triggerClassName,
  menuClassName,
}: {
  label: string;
  value: number | null;
  options: SearchableSelectOption[];
  onChange: (value: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  labelClassName?: string;
  triggerClassName?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const selected = options.find((option) => option.id === value) ?? null;
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.name.toLowerCase().includes(q));
  }, [options, query]);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const viewportGap = 8;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.max(viewportGap, Math.min(rect.left, window.innerWidth - width - viewportGap));
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportGap;
    const spaceAbove = rect.top - gap - viewportGap;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(256, openUp ? spaceAbove : spaceBelow));
    setPosition(
      openUp
        ? { bottom: window.innerHeight - rect.top + gap, left, width, maxHeight, openUp }
        : { top: rect.bottom + gap, left, width, maxHeight, openUp }
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    const timer = setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(timer);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleViewport = () => measure();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewport);
    window.addEventListener("scroll", handleViewport, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewport);
      window.removeEventListener("scroll", handleViewport, true);
    };
  }, [open, measure]);

  const pick = (next: number | null) => {
    onChange(next);
    setOpen(false);
  };

  const toggle = () => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      measure();
    }
    setOpen((isOpen) => !isOpen);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        toggle();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) pick(option.id);
    }
  };

  return (
    <label className="block">
      <span className={cn("mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--text-muted)]", labelClassName)}>
        {label}
        {required && <span className="ml-1 text-[#EC4899]">*</span>}
      </span>
      <div ref={wrapRef} className="relative" onKeyDown={handleKeyDown}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          className={cn(
            "flex w-full items-center justify-between gap-2 text-left outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            triggerClassName
          )}
        >
          <span className={cn("truncate", !selected && "text-[var(--text-muted)]")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown size={13} className={cn("shrink-0 text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
        </button>

        {open && position && createPortal(
          <div className="platform-shell contents">
            <div
              ref={menuRef}
              style={{
                ...(position.openUp ? { bottom: position.bottom } : { top: position.top }),
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              className={cn(
                "fixed z-[80] overflow-y-auto rounded-[12px] border-2 border-[var(--border)] bg-[var(--platform-input)] p-1.5 shadow-xl",
                menuClassName
              )}
            >
              <div className="sticky top-0 z-10 bg-[var(--platform-input)] pb-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                    placeholder={`Search ${label.toLowerCase()}…`}
                    aria-label={`Search ${label}`}
                    className="h-9 w-full rounded-[8px] border border-[var(--border)] bg-[var(--platform-soft)] pl-8 pr-2.5 text-[11px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[#EC4899]/60"
                  />
                </div>
              </div>

              {allowClear && (
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
                    selected === null
                      ? "bg-[#EC4899]/10 text-[#EC4899]"
                      : "text-[var(--text-muted)] hover:bg-[var(--platform-soft)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className="truncate">{placeholder}</span>
                  {selected === null && <Check size={13} className="shrink-0" />}
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11px] font-medium text-[var(--text-muted)]">No matches</p>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selected?.id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => pick(option.id)}
                      title={option.name}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
                        isSelected
                          ? "bg-[#EC4899]/10 text-[#EC4899]"
                          : "text-[var(--text-primary)] hover:bg-[var(--platform-soft)]"
                      )}
                    >
                      <span className="truncate">
                        {option.name}
                        {option.count !== undefined ? ` (${option.count})` : ""}
                      </span>
                      {isSelected && <Check size={13} className="shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </label>
  );
}
