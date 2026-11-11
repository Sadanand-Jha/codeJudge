"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useSyllabusImportAccess } from "@/hooks/useSyllabusImportAccess";
import {
  searchSyllabus,
  type SyllabusSearchItem,
  type SyllabusSearchType,
} from "@/services/syllabus";

interface SyllabusSearchSelectProps {
  type: SyllabusSearchType;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  theme?: "light" | "dark";
  /** Restrict chapter results to a syllabus, or topic results to a chapter. */
  syllabusId?: number | null;
  chapterId?: number | null;
  /** Single-select */
  value?: number | null;
  onChange?: (item: SyllabusSearchItem | null) => void;
  /** Multi-select */
  multiple?: boolean;
  values?: number[];
  onValuesChange?: (items: SyllabusSearchItem[]) => void;
  selectedLabel?: string | null;
  selectedLabels?: Record<number, string> | null;
  allowClear?: boolean;
}

const fieldLight =
  "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left text-xs font-semibold text-text-primary outline-none transition-all hover:border-border-hover focus:border-pink-500/50 disabled:cursor-not-allowed disabled:opacity-50";
const fieldDark =
  "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#111217] px-4 text-left text-sm font-medium text-white outline-none transition-all hover:border-white/20 focus:border-[#EC4899]/50 disabled:cursor-not-allowed disabled:opacity-50";

export function SyllabusSearchSelect({
  type,
  label,
  placeholder,
  disabled,
  required,
  className,
  theme = "light",
  syllabusId,
  chapterId,
  value,
  onChange,
  multiple = false,
  values = [],
  onValuesChange,
  selectedLabel,
  selectedLabels,
  allowClear = true,
}: SyllabusSearchSelectProps) {
  const dark = theme === "dark";
  const router = useRouter();
  const { requestImport } = useSyllabusImportAccess();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SyllabusSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [singleItem, setSingleItem] = useState<SyllabusSearchItem | null>(null);
  const [multiItems, setMultiItems] = useState<Map<number, SyllabusSearchItem>>(new Map());
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await searchSyllabus({
          q: query,
          type,
          syllabusId: syllabusId ?? null,
          chapterId: chapterId ?? null,
          limit: 80,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResults(rows);
          setActive(0);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setResults([]);
          setError(loadError instanceof Error ? loadError.message : "Could not load syllabi.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 220 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, type, syllabusId, chapterId]);

  const grouped = useMemo(() => {
    const teacher = results.filter((item) => item.scope === "teacher");
    const system = results.filter((item) => item.scope === "system");
    return { teacher, system, flat: [...teacher, ...system] };
  }, [results]);

  const selectedName = multiple
    ? values
        .map((id) => multiItems.get(id)?.name ?? selectedLabels?.[id] ?? `#${id}`)
        .join(", ")
    : value != null
      ? singleItem && singleItem.id === value
        ? singleItem.name
        : selectedLabel || `#${value}`
      : selectedLabel?.trim() || null;

  const selectedCount = multiple
    ? values.length
    : value != null || Boolean(selectedLabel?.trim())
      ? 1
      : 0;
  const defaultPlaceholder =
    type === "syllabus"
      ? "Select syllabus"
      : type === "chapter"
        ? "Select chapter"
        : "Select topic";

  const choose = (item: SyllabusSearchItem) => {
    if (multiple) {
      const nextItems = new Map(multiItems);
      const nextValues = new Set(values);
      if (nextValues.has(item.id)) {
        nextValues.delete(item.id);
        nextItems.delete(item.id);
      } else {
        nextValues.add(item.id);
        nextItems.set(item.id, item);
      }
      setMultiItems(nextItems);
      onValuesChange?.([...nextValues].map((id) => nextItems.get(id)!).filter(Boolean));
      return;
    }
    setSingleItem(item);
    onChange?.(item);
    setOpen(false);
  };

  const clear = () => {
    if (multiple) {
      setMultiItems(new Map());
      onValuesChange?.([]);
    } else {
      setSingleItem(null);
      onChange?.(null);
    }
    setOpen(false);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, grouped.flat.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = grouped.flat[active];
      if (item) {
        choose(item);
      }
    }
  };

  const isSelected = (item: SyllabusSearchItem) =>
    multiple ? values.includes(item.id) : value === item.id;

  const renderRow = (item: SyllabusSearchItem, index: number) => {
    const current = isSelected(item);
    const subtitle =
      item.type === "syllabus"
        ? item.subject
        : item.type === "chapter"
          ? item.syllabusName
          : `${item.syllabusName} · ${item.chapterName ?? ""}`;
    const showSubtitle =
      Boolean(subtitle?.trim()) &&
      subtitle.trim().toLocaleLowerCase() !== item.name.trim().toLocaleLowerCase();
    return (
      <button
        key={`${item.type}-${item.scope}-${item.id}`}
        type="button"
        role="option"
        aria-selected={current}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(item)}
        className={cn(
          "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
          index === active ? (dark ? "bg-white/5" : "bg-card-hover") : "",
          current
            ? dark
              ? "text-[#f9a8d4]"
              : "text-pink-600 dark:text-pink-300"
            : dark
              ? "text-white"
              : "text-text-primary"
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border",
            current
              ? "border-transparent bg-gradient-to-br from-pink-500 to-violet-600 text-white"
              : dark
                ? "border-white/20"
                : "border-border-hover"
          )}
        >
          {current && <Check className="h-3 w-3" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{item.name}</span>
          {showSubtitle && (
            <span
              className={cn(
                "mt-0.5 block truncate text-[10px] font-medium",
                dark ? "text-white/45" : "text-text-muted"
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
        {item.scope === "teacher" && (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              dark ? "bg-pink-500/15 text-pink-300" : "bg-pink-500/10 text-pink-600"
            )}
          >
            Mine
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={className}>
      {label && (
        <span
          className={cn(
            "mb-1.5 block text-xs font-bold",
            dark ? "text-white" : "text-text-primary"
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-pink-500">*</span>}
        </span>
      )}
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen((isOpen) => !isOpen)}
          disabled={disabled}
          className={cn(dark ? fieldDark : fieldLight, open && "border-pink-500/50")}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span
            className={cn(
              "truncate",
              !selectedName && (dark ? "font-normal text-white/45" : "font-medium text-text-muted")
            )}
            title={selectedName ?? undefined}
          >
            {selectedName || placeholder || defaultPlaceholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {selectedCount > 0 && allowClear && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={(event) => {
                  event.stopPropagation();
                  clear();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    clear();
                  }
                }}
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-md",
                  dark ? "hover:bg-white/10" : "hover:bg-card-hover"
                )}
              >
                <X className="h-3 w-3" />
              </span>
            )}
            {multiple && selectedCount > 0 && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  dark ? "bg-white/10 text-white/70" : "bg-pink-500/10 text-pink-600"
                )}
              >
                {selectedCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                dark ? "text-white/45" : "text-text-muted",
                open && "rotate-180"
              )}
            />
          </span>
        </button>

        {open && (
          <div
            className={cn(
              "absolute left-0 top-full z-50 mt-1.5 w-full min-w-[290px] overflow-hidden rounded-xl border shadow-2xl",
              dark ? "border-white/10 bg-[#111217]" : "border-border bg-card"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 border-b px-3",
                dark ? "border-white/10" : "border-border"
              )}
            >
              <Search className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-white/40" : "text-text-muted")} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={`Search ${type === "syllabus" ? "syllabi" : `${type}s`}…`}
                aria-label={`Search ${type}`}
                className={cn(
                  "h-10 w-full bg-transparent text-xs outline-none",
                  dark
                    ? "text-white placeholder:text-white/35"
                    : "text-text-primary placeholder:text-text-muted"
                )}
              />
              {loading && (
                <span className={cn("text-[10px] font-medium", dark ? "text-white/40" : "text-text-muted")}>
                  Loading…
                </span>
              )}
            </div>

            <div
              role="listbox"
              aria-multiselectable={multiple}
              className="max-h-72 overflow-y-auto p-1.5"
            >
              {error ? (
                <p className={cn("px-3 py-6 text-center text-xs", dark ? "text-red-300" : "text-red-600")}>
                  {error}
                </p>
              ) : grouped.flat.length === 0 ? (
                loading ? (
                  <p className={cn("px-3 py-6 text-center text-xs", dark ? "text-white/45" : "text-text-muted")}>
                    Loading…
                  </p>
                ) : results.length === 0 && !query.trim() ? (
                  <div className="px-3 py-5 text-center">
                    <p className={cn("text-xs font-bold", dark ? "text-white" : "text-text-primary")}>
                      No syllabus imported yet
                    </p>
                    <p className={cn("mt-1 text-[11px]", dark ? "text-white/45" : "text-text-muted")}>
                      Import your syllabus to select subjects, chapters, and topics.
                    </p>
                    <button
                      type="button"
                      onClick={() => requestImport(() => router.push("/creator/syllabus"))}
                      className={cn(
                        "mt-2 inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-bold",
                        dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-pink-500/10 text-pink-600 hover:bg-pink-500/15"
                      )}
                    >
                      Import syllabus
                    </button>
                  </div>
                ) : (
                  <p className={cn("px-3 py-6 text-center text-xs", dark ? "text-white/45" : "text-text-muted")}>
                    No matches found
                  </p>
                )
              ) : (
                <>
                  {grouped.teacher.length > 0 && (
                    <>
                      <p
                        className={cn(
                          "px-2.5 pb-1 pt-1.5 text-[9px] font-black uppercase tracking-[0.12em]",
                          dark ? "text-white/35" : "text-text-muted"
                        )}
                      >
                        My Syllabus
                      </p>
                      {grouped.teacher.map((item, index) => renderRow(item, index))}
                    </>
                  )}
                  {grouped.system.length > 0 && (
                    <>
                      <p
                        className={cn(
                          "px-2.5 pb-1 pt-2 text-[9px] font-black uppercase tracking-[0.12em]",
                          dark ? "text-white/35" : "text-text-muted"
                        )}
                      >
                        System
                      </p>
                      {grouped.system.map((item, index) =>
                        renderRow(item, grouped.teacher.length + index)
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {multiple && (
              <div
                className={cn(
                  "flex items-center justify-between border-t px-3 py-2",
                  dark ? "border-white/10" : "border-border"
                )}
              >
                <button
                  type="button"
                  onClick={clear}
                  className={cn(
                    "text-[11px] font-bold",
                    dark ? "text-white/50 hover:text-white" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SyllabusSearchSelect;
