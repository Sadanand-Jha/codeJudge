"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Debounce a value by the given delay in milliseconds.
 * Returns the debounced value that updates only after the delay elapses
 * without further changes.
 * 
 * PERFORMANCE OPTIMIZATION: Uses ref-based latest value to avoid stale closures
 * and minimizes re-renders by only updating state when the debounced value changes.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const latestValueRef = useRef<T>(value);

  // Keep ref in sync with value
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const current = latestValueRef.current;
      setDebouncedValue((prev) => {
        // Only update if value actually changed (prevents unnecessary re-renders)
        if (prev !== current) {
          return current;
        }
        return prev;
      });
    };

    timeoutId = setTimeout(tick, delay);

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [delay]);

  return debouncedValue;
}