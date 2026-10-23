"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/helpers";

export type QsSelectOption<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

const MIN_MENU_WIDTH = 180;
const VIEWPORT_GAP = 8;

export function QsSelect<T extends string | number>({
  id,
  value,
  options,
  onChange,
  multiple = false,
  values,
  onValuesChange,
  placeholder = "Select",
  disabled = false,
  ariaLabel,
  triggerClassName,
  menuClassName,
  align = "left",
  searchable,
  searchPlaceholder = "Search…",
  wrapLabels = false,
  menuWidthScale = 1,
  boundaryRef,
}: {
  id?: string;
  value?: T | null;
  options: QsSelectOption<T>[];
  onChange?: (value: T) => void;
  /** Enables checkbox-style multi-selection via `values`/`onValuesChange`. */
  multiple?: boolean;
  values?: T[];
  onValuesChange?: (values: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Let long trigger/option labels wrap instead of truncating. */
  wrapLabels?: boolean;
  /** Scale the portaled menu wider than its trigger (e.g. 1.5). */
  menuWidthScale?: number;
  /** Keep the portaled menu inside this element instead of the whole viewport. */
  boundaryRef?: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const canSearch = searchable ?? options.length > 6;
  const selectedValues = values ?? [];
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  /* The menu renders in a portal with fixed positioning so ancestors with
     overflow-hidden (rounded qs cards) can never clip it — the mobile bug. */
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const boundary = boundaryRef?.current;
    const boundaryRect = boundary?.getBoundingClientRect();
    const bounds = boundaryRect
      ? {
          left: boundaryRect.left + VIEWPORT_GAP,
          right: boundaryRect.right - VIEWPORT_GAP,
          top: boundaryRect.top + VIEWPORT_GAP,
          bottom: boundaryRect.bottom - VIEWPORT_GAP,
        }
      : {
          left: VIEWPORT_GAP,
          right: window.innerWidth - VIEWPORT_GAP,
          top: VIEWPORT_GAP,
          bottom: window.innerHeight - VIEWPORT_GAP,
        };
    const scaledWidth = rect.width * Math.max(1, menuWidthScale);
    const availableWidth = Math.max(0, bounds.right - bounds.left);
    const minWidth = Math.min(MIN_MENU_WIDTH, availableWidth);
    const width = Math.min(Math.max(scaledWidth, minWidth), availableWidth);
    const maxLeft = bounds.right - width;
    /* Prefer the requested edge ("right" = trigger's right edge). When that
       edge would push the menu off-screen, fall back to the trigger's near
       edge and clamp last — a plain clamp to the viewport gap would park the
       menu at the far left of a phone, detached from its trigger. */
    let left = align === "right" ? rect.right - width : rect.left;
    if (left < bounds.left) left = rect.left;
    if (left > maxLeft) left = rect.right - width;
    left = Math.max(bounds.left, Math.min(left, maxLeft));
    const spaceBelow = bounds.bottom - rect.bottom - 6;
    const spaceAbove = rect.top - bounds.top - 6;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(openUp ? spaceAbove : spaceBelow, 0);
    const maxHeight = Math.min(
      256,
      boundaryRect ? availableHeight : Math.max(availableHeight, canSearch ? 150 : 96)
    );
    setPosition(
      openUp
        ? { bottom: window.innerHeight - rect.top + 6, left, width, maxHeight, openUp }
        : { top: rect.bottom + 6, left, width, maxHeight, openUp }
    );
  }, [align, canSearch, menuWidthScale, boundaryRef]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleViewport = () => measure();
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleViewport);
    window.addEventListener("scroll", handleViewport, true);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleViewport);
      window.removeEventListener("scroll", handleViewport, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open || !canSearch) return;
    const timer = setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(timer);
  }, [open, canSearch]);

  const selected = options.find((option) => option.value === value) ?? null;
  const selectedOptions = multiple
    ? options.filter((option) => selectedValues.includes(option.value))
    : selected
      ? [selected]
      : [];
  const selectableOptions = options.filter((option) => !option.disabled);
  const allSelected =
    multiple &&
    selectableOptions.length > 0 &&
    selectableOptions.every((option) => selectedValues.includes(option.value));
  const triggerLabel = allSelected
    ? placeholder
    : selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions[0].label} +${selectedOptions.length - 1}`;

  const openMenu = () => {
    if (disabled) return;
    if (!open) {
      const index = multiple
        ? options.findIndex((option) => selectedValues.includes(option.value))
        : options.findIndex((option) => option.value === value);
      setQuery("");
      setActiveIndex(index >= 0 ? index : 0);
      measure();
    }
    setOpen((prev) => !prev);
  };

  const choose = (option: QsSelectOption<T>) => {
    if (!option || option.disabled) return;
    if (multiple) {
      const next = selectedValues.includes(option.value)
        ? selectedValues.filter((item) => item !== option.value)
        : [...selectedValues, option.value];
      onValuesChange?.(next);
      return;
    }
    onChange?.(option.value);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const typingInSearch = event.target === searchRef.current;
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home" && !typingInSearch) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && !typingInSearch) {
      event.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    } else if (event.key === " " && !typingInSearch) {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left outline-none transition disabled:cursor-not-allowed disabled:opacity-60",
          triggerClassName
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1",
            wrapLabels ? "break-words [overflow-wrap:anywhere]" : "truncate",
            selectedOptions.length === 0 && "text-[var(--qs-muted)]"
          )}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
        />
      </button>

      {open &&
        position &&
        createPortal(
          /* The menu is portaled to <body>, where the .qs-ui design tokens do
             not exist — without this scope every var(--qs-*) is undefined and
             the menu renders transparent, with no border or yellow shadow.
             `display: contents` keeps the wrapper layout-neutral. */
          <div className="qs-ui contents">
            <div
              ref={menuRef}
              onKeyDown={handleKeyDown}
              style={{
                ...(position.openUp ? { bottom: position.bottom } : { top: position.top }),
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              className={cn(
                "fixed z-[80] overflow-y-auto rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[4px_4px_0_var(--qs-sun)]",
                menuClassName
              )}
            >
              {(canSearch || multiple) && (
                <div className="sticky top-0 z-10 bg-[var(--qs-surface)] p-1.5 pb-0">
                  {canSearch && (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--qs-muted)]" />
                      <input
                        ref={searchRef}
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setActiveIndex(0);
                        }}
                        placeholder={searchPlaceholder}
                        aria-label={ariaLabel ? `Search ${ariaLabel}` : "Search options"}
                        className="h-9 w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] pl-8 pr-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                      />
                    </div>
                  )}
                  {multiple && (
                    <div className="flex items-center justify-between gap-2 px-1 pt-1.5 text-[11px] font-bold text-[var(--qs-muted)]">
                      <span>{selectedValues.length} selected</span>
                      <div className="flex items-center gap-2">
                        {selectableOptions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onValuesChange?.(selectableOptions.map((option) => option.value))}
                            disabled={allSelected}
                            className="rounded-[6px] px-1.5 py-0.5 text-[var(--qs-brand)] transition-colors hover:bg-[var(--qs-poly-1)] disabled:opacity-40"
                          >
                            Select all
                          </button>
                        )}
                        {selectedValues.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onValuesChange?.([])}
                            className="rounded-[6px] px-1.5 py-0.5 text-[var(--qs-brand)] transition-colors hover:bg-[var(--qs-poly-1)]"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <ul
                role="listbox"
                aria-label={ariaLabel}
                aria-multiselectable={multiple || undefined}
                className="p-1.5"
              >
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-4 text-center text-[13px] text-[var(--qs-muted)]">
                    {options.length === 0 ? "No options" : "No matches"}
                  </li>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = multiple
                      ? selectedValues.includes(option.value)
                      : option.value === value;
                    return (
                      <li key={String(option.value)}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={option.disabled}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => choose(option)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
                            index === activeIndex && "bg-[var(--qs-bg)]",
                            isSelected
                              ? "font-extrabold text-[var(--qs-brand)]"
                              : "font-medium text-[var(--qs-ink)]"
                          )}
                        >
                          <span
                            className={cn(
                              "flex min-w-0 flex-1 gap-2",
                              wrapLabels ? "items-start" : "items-center"
                            )}
                          >
                            {multiple ? (
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border-2 transition-colors",
                                  isSelected
                                    ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-white"
                                    : "border-[var(--qs-line)] bg-[var(--qs-surface)]",
                                  wrapLabels && "mt-0.5"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                "min-w-0 flex-1",
                                wrapLabels ? "break-words [overflow-wrap:anywhere]" : "truncate"
                              )}
                            >
                              {option.label}
                            </span>
                          </span>
                          {!multiple && isSelected && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
