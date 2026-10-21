"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/helpers";

export type SearchableSelectOption = {
  id: number;
  name: string;
  count?: number;
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
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selected = options.find((option) => option.id === value) ?? null;
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.name.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const pick = (next: number | null) => {
    onChange(next);
    setOpen(false);
  };

  const toggle = () => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
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

        {open && (
          <div
            className={cn(
              "absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-[12px] border-2 border-[var(--border)] bg-[var(--platform-input)] p-1.5 shadow-xl",
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
        )}
      </div>
    </label>
  );
}
