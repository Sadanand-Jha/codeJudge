"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a value by the given delay in milliseconds.
 * Returns the debounced value that updates only after the delay elapses
 * without further changes.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}