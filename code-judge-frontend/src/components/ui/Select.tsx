"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/helpers";

export interface SelectChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  children?: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: SelectChangeEvent) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  menuClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  "aria-required"?: boolean | "true" | "false";
  title?: string;
  style?: CSSProperties;
  tabIndex?: number;
  showChevron?: boolean;
  menuAlign?: "left" | "right";
  tone?: "default" | "dark";
}

const MENU_OFFSET = 6;
const MENU_MAX_HEIGHT = 288;
const VIEWPORT_PADDING = 8;

function textContent(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement(node)) {
    return textContent((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function extractOptions(children: ReactNode): SelectOption[] {
  const collected: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    };
    if (child.type === "option") {
      const label = textContent(props.children).trim();
      collected.push({
        value: props.value !== undefined ? String(props.value) : label,
        label,
        disabled: Boolean(props.disabled),
      });
      return;
    }
    if (child.type === "optgroup" || child.type === Fragment) {
      collected.push(...extractOptions(props.children));
    }
  });
  return collected;
}

export default function Select({
  children,
  value,
  defaultValue,
  onChange,
  disabled = false,
  name,
  id,
  className,
  menuClassName,
  placeholder,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  title,
  style,
  tabIndex,
  showChevron = true,
  menuAlign = "left",
  tone = "default",
}: SelectProps) {
  const options = useMemo(() => extractOptions(children), [children]);
  const menuId = useId();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    defaultValue !== undefined ? String(defaultValue) : ""
  );
  const currentValue = isControlled ? String(value) : internalValue;

  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [position, setPosition] = useState<
    | { left: number; width: number; maxHeight: number; top?: number; bottom?: number }
    | null
  >(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === currentValue);
  const displayLabel = selectedOption?.label ?? placeholder ?? "";

  const openMenu = () => {
    const selectedIndex = options.findIndex((option) => option.value === currentValue);
    const firstEnabled = options.findIndex((option) => !option.disabled);
    setHighlighted(selectedIndex >= 0 ? selectedIndex : firstEnabled);
    setOpen(true);
  };

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      Math.max(rect.width, 176),
      viewportWidth - VIEWPORT_PADDING * 2
    );
    const left =
      menuAlign === "right"
        ? Math.max(
            VIEWPORT_PADDING,
            Math.min(rect.right - width, viewportWidth - width - VIEWPORT_PADDING)
          )
        : Math.max(
            VIEWPORT_PADDING,
            Math.min(rect.left, viewportWidth - width - VIEWPORT_PADDING)
          );
    const spaceBelow = viewportHeight - rect.bottom - MENU_OFFSET - VIEWPORT_PADDING;
    const spaceAbove = rect.top - MENU_OFFSET - VIEWPORT_PADDING;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    if (openUp) {
      setPosition({
        left,
        width,
        bottom: viewportHeight - rect.top + MENU_OFFSET,
        maxHeight: Math.min(MENU_MAX_HEIGHT, Math.max(120, spaceAbove)),
      });
    } else {
      setPosition({
        left,
        width,
        top: rect.bottom + MENU_OFFSET,
        maxHeight: Math.min(MENU_MAX_HEIGHT, Math.max(120, spaceBelow)),
      });
    }
  }, [menuAlign]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const moveHighlight = (direction: 1 | -1) => {
    if (options.length === 0) return;
    let next = highlighted;
    for (let step = 0; step < options.length; step += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) {
        setHighlighted(next);
        return;
      }
    }
  };

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    const target = { value: option.value, ...(name ? { name } : {}) };
    const event: SelectChangeEvent = {
      target: { ...target },
      currentTarget: { ...target },
    };
    if (!isControlled) setInternalValue(option.value);
    onChange?.(event);
    if (!isControlled) setInternalValue(event.target.value);
    setOpen(false);
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setHighlighted(options.findIndex((option) => !option.disabled));
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index]?.disabled) {
          setHighlighted(index);
          break;
        }
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[highlighted];
      if (option) choose(option);
    }
  };

  return (
    <>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        title={title}
        style={style}
        tabIndex={tabIndex}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex items-center justify-between gap-2 text-left outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      >
        <span className={cn("truncate", !displayLabel && "opacity-60")}>
          {displayLabel || placeholder || "\u00A0"}
        </span>
        {showChevron ? (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        ) : null}
      </button>

      {open && position
        ? createPortal(
            <AnimatePresence>
              <motion.div
                ref={menuRef}
                id={menuId}
                role="listbox"
                aria-label={ariaLabel}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.13, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  left: position.left,
                  top: position.top,
                  bottom: position.bottom,
                  width: position.width,
                  maxHeight: position.maxHeight,
                  zIndex: 90,
                }}
                className={cn(
                  "overflow-y-auto rounded-xl border p-1.5 shadow-2xl",
                  tone === "dark"
                    ? "border-[#333] bg-[#1a1a1a] shadow-black/50"
                    : "border-border bg-card shadow-black/25",
                  menuClassName
                )}
              >
                {options.length === 0 ? (
                  <p className="px-2.5 py-2 text-xs font-medium text-text-muted">
                    No options
                  </p>
                ) : (
                  options.map((option, index) => {
                    const active = option.value === currentValue;
                    return (
                      <button
                        key={`${option.value}-${index}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        disabled={option.disabled}
                        onMouseEnter={() => setHighlighted(index)}
                        onClick={() => choose(option)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          tone === "dark"
                            ? active
                              ? "bg-white/10 text-white"
                              : "text-gray-300 hover:bg-white/10 hover:text-white"
                            : active
                              ? "bg-accent/10 text-accent"
                              : "text-text-secondary hover:bg-card-hover hover:text-text-primary",
                          !active &&
                            highlighted === index &&
                            (tone === "dark"
                              ? "bg-white/10 text-white"
                              : "bg-card-hover text-text-primary")
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {active ? (
                          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.6} />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
