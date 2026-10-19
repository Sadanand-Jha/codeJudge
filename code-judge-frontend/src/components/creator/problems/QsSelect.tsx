"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
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
  placeholder = "Select",
  disabled = false,
  ariaLabel,
  triggerClassName,
  menuClassName,
  align = "left",
}: {
  id?: string;
  value: T | null;
  options: QsSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);

  /* The menu renders in a portal with fixed positioning so ancestors with
     overflow-hidden (rounded qs cards) can never clip it — the mobile bug. */
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, MIN_MENU_WIDTH), window.innerWidth - VIEWPORT_GAP * 2);
    const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP);
    /* Prefer the requested edge ("right" = trigger's right edge). When that
       edge would push the menu off-screen, fall back to the trigger's near
       edge and clamp last — a plain clamp to the viewport gap would park the
       menu at the far left of a phone, detached from its trigger. */
    let left = align === "right" ? rect.right - width : rect.left;
    if (left < VIEWPORT_GAP) left = rect.left;
    if (left > maxLeft) left = rect.right - width;
    left = Math.max(VIEWPORT_GAP, Math.min(left, maxLeft));
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP * 2;
    const spaceAbove = rect.top - VIEWPORT_GAP * 2;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(256, Math.max(openUp ? spaceAbove : spaceBelow, 96));
    setPosition(
      openUp
        ? { bottom: window.innerHeight - rect.top + 6, left, width, maxHeight, openUp }
        : { top: rect.bottom + 6, left, width, maxHeight, openUp }
    );
  }, [align]);

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

  const selected = options.find((option) => option.value === value) ?? null;

  const openMenu = () => {
    if (disabled) return;
    if (!open) {
      const index = options.findIndex((option) => option.value === value);
      setActiveIndex(index >= 0 ? index : 0);
      measure();
    }
    setOpen((prev) => !prev);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
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
        <span className={cn("truncate", !selected && "text-[var(--qs-muted)]")}>
          {selected ? selected.label : placeholder}
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
            <ul
              ref={menuRef}
              role="listbox"
              aria-label={ariaLabel}
              style={{
                ...(position.openUp ? { bottom: position.bottom } : { top: position.top }),
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              className={cn(
                "fixed z-[80] overflow-y-auto rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[4px_4px_0_var(--qs-sun)]",
                menuClassName
              )}
            >
              {options.length === 0 ? (
                <li className="px-3 py-4 text-center text-[13px] text-[var(--qs-muted)]">No options</li>
              ) : (
                options.map((option, index) => {
                  const isSelected = option.value === value;
                  return (
                    <li key={String(option.value)}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={option.disabled}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(index)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
                          index === activeIndex && "bg-[var(--qs-bg)]",
                          isSelected
                            ? "font-extrabold text-[var(--qs-brand)]"
                            : "font-medium text-[var(--qs-ink)]"
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
