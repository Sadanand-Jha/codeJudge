"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type ChangeEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check, Loader2, X, AlertCircle, RotateCw } from "lucide-react";
import { cn } from "@/lib/helpers";

/* =============================================
   SearchableDropdown — A fully accessible,
   reusable combobox with async search, caching,
   request cancellation, keyboard navigation,
   and dark/light theme support.
   ============================================= */

export interface SearchableDropdownOption {
  id: string | number;
  label: string;
  value?: string | number;
  description?: string;
}

export interface SearchableDropdownProps {
  /** Label displayed above the input */
  label?: string;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Currently selected label (controlled) */
  value?: string;
  /** Currently selected option id (for highlighting) */
  selectedId?: string | number;
  /** Called when an option is selected */
  onSelect: (option: SearchableDropdownOption) => void;
  /** Called when the selection is cleared */
  onClear?: () => void;
  /** Async search function — receives the query and an AbortSignal */
  searchFn: (query: string, signal: AbortSignal) => Promise<SearchableDropdownOption[]>;
  /** Minimum characters before searching (default: 1) */
  minChars?: number;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Maximum number of visible options (default: 8) */
  maxVisible?: number;
  /** Additional class names for the root element */
  className?: string;
  /** Icon displayed before the label */
  icon?: ReactNode;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is optional */
  optional?: boolean;
  /** Disable the entire control */
  disabled?: boolean;
  /** aria-describedby id for error messages */
  "aria-describedby"?: string;
}

const DROPDOWN_VARIANTS = {
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  closed: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: { duration: 0.12, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export function SearchableDropdown({
  label,
  placeholder = "Search...",
  value,
  selectedId,
  onSelect,
  onClear,
  searchFn,
  minChars = 1,
  debounceMs = 300,
  maxVisible = 8,
  className,
  icon,
  required,
  optional,
  disabled,
  "aria-describedby": ariaDescribedBy,
}: SearchableDropdownProps) {
  /* ── State ── */
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? "");
  const [options, setOptions] = useState<SearchableDropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  /* ── Refs ── */
  const cacheRef = useRef<Map<string, SearchableDropdownOption[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value ?? "");

  /* ── Sync inputValue when the controlled `value` changes ── */
  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value ?? "";
      setInputValue(value ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /* ── Click-outside handler ── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  /* ── Escape key handler on the whole document when open ── */
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  /* ── Debounced search ── */
  useEffect(() => {
    const query = inputValue.trim();

    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // If query is too short, clear options and return
    if (query.length < minChars) {
      setOptions([]);
      setLoading(false);
      setError(null);
      setHighlightedIndex(-1);
      return;
    }

    // Check cache first — avoid duplicate requests
    const cached = cacheRef.current.get(query);
    if (cached) {
      setOptions(cached);
      setLoading(false);
      setError(null);
      setHighlightedIndex(-1);
      return;
    }

    // Debounce the actual request
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, minChars, debounceMs]);

  /* ── performSearch ── */
  const performSearch = useCallback(
    async (query: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);
      setOptions([]);
      setHighlightedIndex(-1);

      try {
        const results = await searchFn(query, controller.signal);

        // Ignore stale responses — if a newer request was made, the controller
        // would have been aborted. AbortError means we should ignore.
        if (controller.signal.aborted) return;

        // Cache the results
        cacheRef.current.set(query, results);

        setOptions(results);
        if (results.length === 0) {
          setError(null);
        }
      } catch (err: any) {
        // Ignore aborted requests
        if (err?.name === "AbortError" || controller.signal.aborted) return;

        setError("Failed to load subjects");
        setOptions([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [searchFn],
  );

  /* ── Handlers ── */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Clear error when user starts typing again
    if (error) setError(null);
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setOpen(true);
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % Math.max(options.length, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? -1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (loading) return;
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          selectOption(options[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        handleClose();
        break;
      case "Tab":
        handleClose();
        break;
    }
  };

  const selectOption = (option: SearchableDropdownOption) => {
    setInputValue(option.label);
    lastValueRef.current = option.label;
    setOpen(false);
    setOptions([]);
    setHighlightedIndex(-1);
    setError(null);
    onSelect(option);
  };

  const handleOptionClick = (option: SearchableDropdownOption) => {
    selectOption(option);
  };

  const handleRetry = () => {
    const query = inputValue.trim();
    if (query.length >= minChars) {
      // Clear cache for this query to force a fresh request
      cacheRef.current.delete(query);
      performSearch(query);
    }
  };

  const handleClear = () => {
    setInputValue("");
    lastValueRef.current = "";
    setOptions([]);
    setError(null);
    setHighlightedIndex(-1);
    onClear?.();
  };

  const handleClose = () => {
    setOpen(false);
    setHighlightedIndex(-1);
    // Reset input to the selected value
    if (value) {
      setInputValue(value);
      lastValueRef.current = value;
    } else {
      setInputValue("");
      lastValueRef.current = "";
    }
  };

  /* ── Derived values ── */
  const showClearButton = inputValue.length > 0 && !disabled;
  const isInputEmpty = inputValue.length === 0;
  const maxDropdownHeight = Math.min(maxVisible, 8) * 3.5 + 4; // rem

  return (
    <div
      ref={dropdownRef}
      className={cn("relative w-full", className)}
      data-searchable-dropdown
    >
      {label && (
        <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          {icon}
          {label}
          {required && <span className="text-danger">*</span>}
          {optional && (
            <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Optional
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-owns={open ? "searchable-dropdown-listbox" : undefined}
          aria-activedescendant={
            highlightedIndex >= 0 ? `searchable-dropdown-option-${highlightedIndex}` : undefined
          }
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "w-full h-11 rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted transition-all duration-200",
            "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon ? "pl-10" : "pl-4",
            "pr-10",
          )}
        />

        {/* Search icon */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />

        {/* Right-side controls: loading / clear / chevron */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {loading && <Loader2 className="h-4 w-4 text-accent animate-spin" />}
          {showClearButton && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-accent/10 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform duration-200",
              open && "rotate-180 text-text-primary",
            )}
          />
        </div>
      </div>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={DROPDOWN_VARIANTS}
            initial="closed"
            animate="open"
            exit="closed"
            className={cn(
              "absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/50",
            )}
            style={{ maxHeight: `${maxDropdownHeight}rem` }}
          >
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span>Searching...</span>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-danger mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                >
                  <RotateCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}

            {/* Options list */}
            {!loading && !error && (
              <>
                {options.length === 0 && inputValue.trim().length >= minChars ? (
                  <div className="px-4 py-3 text-sm text-text-secondary">
                    No subjects found
                  </div>
                ) : (
                  <ul
                    id="searchable-dropdown-listbox"
                    role="listbox"
                    className="py-1.5 overflow-y-auto"
                  >
                    {options.map((option, index) => {
                      const isSelected =
                        selectedId != null && String(option.id) === String(selectedId);
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <li key={String(option.id)} role="option" aria-selected={isSelected}>
                          <button
                            id={`searchable-dropdown-option-${index}`}
                            type="button"
                            onMouseDown={(e) => {
                              // prevent blur from closing before click registers
                              e.preventDefault();
                              handleOptionClick(option);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              isHighlighted || isSelected
                                ? "bg-accent/10 text-accent"
                                : "text-text-secondary hover:bg-accent/5 hover:text-text-primary",
                            )}
                          >
                            <span className="flex-1 truncate">
                              {option.label}
                              {option.description && (
                                <span className="block text-xs text-text-muted">
                                  {option.description}
                                </span>
                              )}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Hint when input is empty and dropdown is open */}
                {!loading && !error && options.length === 0 && isInputEmpty && (
                  <div className="px-4 py-3 text-sm text-text-secondary">
                    Type to search subjects...
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
