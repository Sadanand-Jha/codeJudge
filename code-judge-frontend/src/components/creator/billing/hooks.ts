"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BillingPageState } from "./types";

/**
 * Simulated async data hook for the billing module.
 *
 * Wraps the loading → ready / empty / error lifecycle that a real API call
 * would have, so every page exercises the same state machinery. Wire the
 * loader to `fetch(...)` when the backend exists.
 *
 * @param loader   returns the page's data (mock for now)
 * @param options  `delayMs` simulates latency; `demoState` lets you preview
 *                 empty/error states via `?state=empty` / `?state=error`
 */
export function useBillingData<T>(
  loader: () => T | Promise<T>,
  options?: { delayMs?: number; demoState?: "empty" | "error" }
) {
  const [state, setState] = useState<BillingPageState>("loading");
  const [data, setData] = useState<T | null>(null);

  const loaderRef = useRef(loader);
  const optsRef = useRef(options);
  useEffect(() => {
    loaderRef.current = loader;
    optsRef.current = options;
  });

  const demoState = options?.demoState;

  const fetchData = useCallback(() => {
    const delay = optsRef.current?.delayMs ?? 700;
    const timer = setTimeout(() => {
      if (demoState === "empty") {
        setData(null);
        setState("empty");
        return;
      }
      if (demoState === "error") {
        setData(null);
        setState("error");
        return;
      }
      Promise.resolve(loaderRef.current()).then((result) => {
        setData(result);
        setState("ready");
      });
    }, delay);
    return timer;
  }, [demoState]);

  useEffect(() => {
    const timer = fetchData();
    return () => clearTimeout(timer);
  }, [fetchData]);

  const retry = useCallback(() => {
    setState("loading");
    const timer = fetchData();
    return () => clearTimeout(timer);
  }, [fetchData]);

  return { state, data, retry };
}

/** Parse an optional `?state=` demo switch for empty/error previews. */
export function demoStateFromParams(value: string | string[] | undefined): "empty" | "error" | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "empty" || v === "error" ? v : undefined;
}